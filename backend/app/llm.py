"""LLM client with honest fallback: API when key present, deterministic mock otherwise.

Design: the interface is identical either way — swap implementation, not call sites.
Model name is recorded in agent_runs for audit.
"""

import hashlib
import os
from abc import ABC, abstractmethod

MOCK_MODEL = "mock-deterministic-v1"


class LLMClient(ABC):
    model: str

    @abstractmethod
    def generate(self, system: str, user: str, temperature: float = 0.3) -> str:
        ...


class MockLLM(LLMClient):
    """Deterministic Thai mock outputs — used until API keys are wired (or for tests/demo)."""

    model = MOCK_MODEL

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
        import httpx

        key = os.environ["ANTHROPIC_API_KEY"]
        resp = httpx.post(
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
            timeout=60,
        )
        resp.raise_for_status()
        return "".join(b.get("text", "") for b in resp.json()["content"])


class OpenAILLM(LLMClient):
    model = os.environ.get("OPENAI_MODEL", "gpt-4o-mini")

    def generate(self, system: str, user: str, temperature: float = 0.3) -> str:
        import httpx

        key = os.environ["OPENAI_API_KEY"]
        resp = httpx.post(
            "https://api.openai.com/v1/chat/completions",
            headers={"Authorization": f"Bearer {key}"},
            json={
                "model": self.model,
                "temperature": temperature,
                "messages": [
                    {"role": "system", "content": system},
                    {"role": "user", "content": user},
                ],
            },
            timeout=60,
        )
        resp.raise_for_status()
        return resp.json()["choices"][0]["message"]["content"]


def get_llm() -> LLMClient:
    # explicit override wins (SOLVEN_LLM=mock|anthropic|openai) — useful for demo/tests
    override = os.environ.get("SOLVEN_LLM")
    if override == "mock":
        return MockLLM()
    if override == "anthropic" and os.environ.get("ANTHROPIC_API_KEY"):
        return AnthropicLLM()
    if override == "openai" and os.environ.get("OPENAI_API_KEY"):
        return OpenAILLM()
    if os.environ.get("ANTHROPIC_API_KEY"):
        return AnthropicLLM()
    if os.environ.get("OPENAI_API_KEY"):
        return OpenAILLM()
    return MockLLM()


def sha256(text: str) -> str:
    return hashlib.sha256(text.encode("utf-8")).hexdigest()[:16]
