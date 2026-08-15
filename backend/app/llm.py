"""LLM client with honest fallback: API when key present, deterministic mock otherwise.

Design: the interface is identical either way — swap implementation, not call sites.
Model name is recorded in agent_runs for audit; token usage (when the provider
reports it) is exposed via `last_usage` and persisted by the coordinator.

Providers: mock (deterministic Thai), anthropic, openai, gemini, groq,
openrouter. Groq/OpenRouter are OpenAI-compatible endpoints (shared base
class). Every HTTP adapter retries transient failures twice with backoff.
"""

import hashlib
import os
import time
from abc import ABC, abstractmethod
from typing import Optional

import httpx

MOCK_MODEL = "mock-deterministic-v1"

# Transient-failure retry policy (all real providers): 2 retries, 1s/2s backoff.
MAX_ATTEMPTS = 3
RETRY_BACKOFF_SECONDS = (1.0, 2.0)


def _post_json_with_retry(
    url: str,
    headers: dict,
    json: dict,
    timeout: float = 60,
) -> httpx.Response:
    """POST with bounded retries on transient transport/HTTP failures.

    Retries only connect/timeout errors and 429/5xx — never 4xx auth/validation
    errors (retrying those wastes budget and delays the fail-closed signal).
    """
    last_exc: Optional[Exception] = None
    for attempt in range(MAX_ATTEMPTS):
        try:
            resp = httpx.post(url, headers=headers, json=json, timeout=timeout)
            if resp.status_code < 500 and resp.status_code != 429:
                return resp
            last_exc = httpx.HTTPStatusError(
                f"provider HTTP {resp.status_code}", request=resp.request, response=resp
            )
        except (httpx.ConnectError, httpx.TimeoutException) as exc:
            last_exc = exc
        if attempt < MAX_ATTEMPTS - 1:
            time.sleep(RETRY_BACKOFF_SECONDS[attempt])
    raise last_exc  # type: ignore[misc]


class LLMClient(ABC):
    model: str
    # Filled by real adapters after each generate() when the provider reports
    # token counts — None for mock (zero-cost, nothing to log).
    last_usage: Optional[dict] = None

    @abstractmethod
    def generate(self, system: str, user: str, temperature: float = 0.3) -> str:
        ...


class MockLLM(LLMClient):
    """Deterministic Thai mock outputs — used until API keys are wired (or for tests/demo)."""

    model = MOCK_MODEL
    last_usage = None

    def generate(self, system: str, user: str, temperature: float = 0.3) -> str:
        # The mock acts on the first instruction line of `system`.
        if "grading" in system:
            return (
                "คะแนนโดยประมาณ: 7.5/10\n"
                "จุดเด่น: ตอบตรงคำถาม มีตัวอย่างประกอบ\n"
                "ควรปรับปรุง: อธิบายเหตุผลรองรับคำตอบให้ละเอียดขึ้น\n"
                f'(อ้างอิงจากคำตอบนักเรียน: "{user[:120]}")'
            )
        if "lesson-plan" in system:
            return (
                "แผนการสอน (ร่าง) — 50 นาที\n"
                "1) นำเข้าสู่บทเรียน (10 นาที) — ตั้งคำถามกระตุ้นความสนใจ\n"
                "2) กิจกรรมหลัก (25 นาที) — ให้นักเรียนลงมือทำโจทย์เป็นกลุ่ม\n"
                "3) สรุปและประเมินผล (15 นาที) — quiz ท้ายชั่วโมง\n"
                f'(อิงหัวข้อ/มาตรฐานที่ระบุ: "{user[:120]}")'
            )
        return (
            "ร่างข้อความถึงผู้ปกครอง:\n"
            f"เรียนผู้ปกครอง ขอรายงานความก้าวหน้าของนักเรียนโดยสรุปดังนี้ — {user[:200]}\n"
            "\nกรุณาตรวจทานก่อนส่งจริง (human-in-the-loop)"
        )


class AnthropicLLM(LLMClient):
    """Minimal Anthropic Messages API client (no SDK dependency)."""

    model = os.environ.get("ANTHROPIC_MODEL", "claude-sonnet-4-20250514")

    def generate(self, system: str, user: str, temperature: float = 0.3) -> str:
        key = os.environ["ANTHROPIC_API_KEY"]
        resp = _post_json_with_retry(
            "https://api.anthropic.com/v1/messages",
            headers={
                "x-api-key": key,
                "anthropic-version": "2023-06-01",
                "content-type": "application/json",
            },
            json={
                "model": self.model,
                "max_tokens": 1024,
                "temperature": temperature,
                "system": system,
                "messages": [{"role": "user", "content": user}],
            },
        )
        resp.raise_for_status()
        payload = resp.json()
        usage = payload.get("usage") or {}
        self.last_usage = {
            "input_tokens": usage.get("input_tokens"),
            "output_tokens": usage.get("output_tokens"),
        }
        return "".join(b.get("text", "") for b in payload["content"])


class OpenAILLM(LLMClient):
    """OpenAI-compatible chat completions client (OpenAI, Groq, OpenRouter)."""

    base_url = "https://api.openai.com/v1"
    api_key_env = "OPENAI_API_KEY"
    model_env = "OPENAI_MODEL"
    default_model = "gpt-4o-mini"
    model = os.environ.get(model_env, default_model)

    def generate(self, system: str, user: str, temperature: float = 0.3) -> str:
        key = os.environ[self.api_key_env]
        resp = _post_json_with_retry(
            f"{self.base_url}/chat/completions",
            headers={"Authorization": f"Bearer {key}"},
            json={
                "model": self.model,
                "temperature": temperature,
                "messages": [
                    {"role": "system", "content": system},
                    {"role": "user", "content": user},
                ],
            },
        )
        resp.raise_for_status()
        payload = resp.json()
        usage = payload.get("usage") or {}
        self.last_usage = {
            "input_tokens": usage.get("prompt_tokens"),
            "output_tokens": usage.get("completion_tokens"),
        }
        return payload["choices"][0]["message"]["content"]


class GroqLLM(OpenAILLM):
    """Groq — OpenAI-compatible, low-latency (Llama-family models)."""

    base_url = "https://api.groq.com/openai/v1"
    api_key_env = "GROQ_API_KEY"
    model = os.environ.get("GROQ_MODEL", "llama-3.3-70b-versatile")


class OpenRouterLLM(OpenAILLM):
    """OpenRouter — OpenAI-compatible multi-provider router."""

    base_url = "https://openrouter.ai/api/v1"
    api_key_env = "OPENROUTER_API_KEY"
    model = os.environ.get("OPENROUTER_MODEL", "openai/gpt-4o-mini")


class ThaiLLM(LLMClient):
    """Self-hosted Thai LLM — Typhoon2-8B or OpenThaiGPT.

    Supports local inference via Ollama, vLLM, or OpenAI-compatible API.
    Data sovereignty: all student data stays in Thailand (AIS Cloud/EEC).
    """

    base_url = os.environ.get("THAI_LLM_BASE_URL", "http://localhost:11434/v1")
    api_key_env = "THAI_LLM_API_KEY"
    model = os.environ.get("THAI_LLM_MODEL", "typhoon2-8b")

    def generate(self, system: str, user: str, temperature: float = 0.3) -> str:
        key = os.environ.get(self.api_key_env, "ollama")
        resp = _post_json_with_retry(
            f"{self.base_url}/chat/completions",
            headers={"Authorization": f"Bearer {key}"},
            json={
                "model": self.model,
                "temperature": temperature,
                "messages": [
                    {"role": "system", "content": system},
                    {"role": "user", "content": user},
                ],
            },
        )
        resp.raise_for_status()
        payload = resp.json()
        usage = payload.get("usage") or {}
        self.last_usage = {
            "input_tokens": usage.get("prompt_tokens"),
            "output_tokens": usage.get("completion_tokens"),
        }
        return payload["choices"][0]["message"]["content"]


class GeminiLLM(LLMClient):
    """Google Gemini generateContent API (no SDK dependency)."""

    model = os.environ.get("GEMINI_MODEL", "gemini-2.0-flash")

    def generate(self, system: str, user: str, temperature: float = 0.3) -> str:
        key = os.environ["GEMINI_API_KEY"]
        url = (
            "https://generativelanguage.googleapis.com/v1beta/models/"
            f"{self.model}:generateContent"
        )
        resp = _post_json_with_retry(
            url,
            headers={"x-goog-api-key": key, "content-type": "application/json"},
            json={
                "systemInstruction": {"parts": [{"text": system}]},
                "contents": [{"parts": [{"text": user}]}],
                "generationConfig": {"temperature": temperature},
            },
        )
        resp.raise_for_status()
        payload = resp.json()
        usage = payload.get("usageMetadata") or {}
        self.last_usage = {
            "input_tokens": usage.get("promptTokenCount"),
            "output_tokens": usage.get("candidatesTokenCount"),
        }
        parts = (payload.get("candidates") or [{}])[0].get("content", {}).get("parts", [])
        return "".join(p.get("text", "") for p in parts)


def get_llm() -> LLMClient:
    # explicit override wins (SOLVEN_LLM=mock|anthropic|openai|gemini|groq|
    # openrouter|auto) — useful for demo/tests; falls back through available
    # keys and finally to the deterministic mock (dev only; production gates
    # in config.py reject mock entirely).
    # NOTE: main.py `os.environ.setdefault("SOLVEN_LLM", settings.llm)` pins
    # the module-import default ("mock") for the whole process — an explicit
    # "mock" override must ALWAYS win, never fall through to a real provider.
    override = os.environ.get("SOLVEN_LLM")
    candidates: list[tuple[str, type[LLMClient], str]] = [
        ("anthropic", AnthropicLLM, "ANTHROPIC_API_KEY"),
        ("openai", OpenAILLM, "OPENAI_API_KEY"),
        ("gemini", GeminiLLM, "GEMINI_API_KEY"),
        ("groq", GroqLLM, "GROQ_API_KEY"),
        ("openrouter", OpenRouterLLM, "OPENROUTER_API_KEY"),
        ("thai", ThaiLLM, "THAI_LLM_API_KEY"),
    ]
    if override == "mock":
        return MockLLM()
    if override and override != "auto":
        for name, cls, key_env in candidates:
            if override == name and os.environ.get(key_env):
                return cls()
        # explicit provider without a key → fall through to auto (never mock:
        # config production gates require the key for the selected provider)
    for name, cls, key_env in candidates:
        if os.environ.get(key_env):
            return cls()
    return MockLLM()


def sha256(text: str) -> str:
    return hashlib.sha256(text.encode("utf-8")).hexdigest()[:16]
