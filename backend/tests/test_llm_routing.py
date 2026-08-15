"""Tests: LLM provider routing, production gates, transient-failure retries."""

import pytest

from app.config import Settings
from app.llm import (
    GeminiLLM,
    GroqLLM,
    MockLLM,
    OpenRouterLLM,
    _post_json_with_retry,
    get_llm,
)


def test_no_keys_returns_mock(monkeypatch):
    for k in ("ANTHROPIC_API_KEY", "OPENAI_API_KEY", "GEMINI_API_KEY", "GROQ_API_KEY", "OPENROUTER_API_KEY"):
        monkeypatch.delenv(k, raising=False)
    monkeypatch.delenv("SOLVEN_LLM", raising=False)
    assert isinstance(get_llm(), MockLLM)


def test_gemini_selected_with_key(monkeypatch):
    monkeypatch.delenv("ANTHROPIC_API_KEY", raising=False)
    monkeypatch.delenv("OPENAI_API_KEY", raising=False)
    monkeypatch.setenv("GEMINI_API_KEY", "g-key")
    monkeypatch.setenv("SOLVEN_LLM", "gemini")
    llm = get_llm()
    assert isinstance(llm, GeminiLLM)
    assert llm.model == "gemini-2.0-flash"


def test_groq_and_openrouter_are_openai_compatible(monkeypatch):
    monkeypatch.delenv("ANTHROPIC_API_KEY", raising=False)
    monkeypatch.delenv("OPENAI_API_KEY", raising=False)
    monkeypatch.delenv("GEMINI_API_KEY", raising=False)

    monkeypatch.setenv("GROQ_API_KEY", "g-key")
    monkeypatch.setenv("SOLVEN_LLM", "groq")
    groq = get_llm()
    assert isinstance(groq, GroqLLM)
    assert groq.base_url == "https://api.groq.com/openai/v1"

    monkeypatch.setenv("OPENROUTER_API_KEY", "or-key")
    monkeypatch.setenv("SOLVEN_LLM", "openrouter")
    orl = get_llm()
    assert isinstance(orl, OpenRouterLLM)
    assert orl.base_url == "https://openrouter.ai/api/v1"


def test_auto_picks_first_available_key(monkeypatch):
    monkeypatch.delenv("ANTHROPIC_API_KEY", raising=False)
    monkeypatch.delenv("OPENAI_API_KEY", raising=False)
    monkeypatch.delenv("GEMINI_API_KEY", raising=False)
    monkeypatch.setenv("GROQ_API_KEY", "g-key")
    monkeypatch.setenv("SOLVEN_LLM", "auto")
    assert isinstance(get_llm(), GroqLLM)


def _prod_settings(llm: str) -> Settings:
    return Settings(
        api_token="x" * 40,
        database_url="postgresql://solven:pass@db.internal:5432/solven",
        env="production",
        llm=llm,
        cors_origins=["https://app.example.com"],
    )


def test_production_gate_requires_gemini_key(monkeypatch):
    monkeypatch.delenv("GEMINI_API_KEY", raising=False)
    with pytest.raises(ValueError, match="gemini"):
        _prod_settings("gemini")


def test_production_gate_passes_with_gemini_key(monkeypatch):
    monkeypatch.setenv("GEMINI_API_KEY", "g-key")
    monkeypatch.delenv("SOLVEN_APPROVED_LLM_PROVIDERS", raising=False)
    s = _prod_settings("gemini")
    assert s.llm == "gemini"


def test_production_gate_requires_groq_key(monkeypatch):
    monkeypatch.delenv("GROQ_API_KEY", raising=False)
    with pytest.raises(ValueError, match="groq"):
        _prod_settings("groq")


def test_production_gate_rejects_unapproved_provider(monkeypatch):
    monkeypatch.setenv("GEMINI_API_KEY", "g-key")
    monkeypatch.setenv("SOLVEN_APPROVED_LLM_PROVIDERS", "anthropic,openai")
    with pytest.raises(ValueError, match="not in SOLVEN_APPROVED_LLM_PROVIDERS"):
        _prod_settings("gemini")


# ---- transient-failure retry policy ----

class _FakeResp:
    def __init__(self, status=200, payload=None):
        self.status_code = status
        self._payload = payload or {}
        self.request = None
        self.response = None

    def json(self):
        return self._payload


def test_retry_succeeds_after_transient_connect_errors(monkeypatch):
    calls = {"n": 0}

    def fake_post(url, headers=None, json=None, timeout=None):
        calls["n"] += 1
        if calls["n"] < 3:
            raise __import__("httpx").ConnectError("boom")
        return _FakeResp()

    monkeypatch.setattr("httpx.post", fake_post)
    resp = _post_json_with_retry("http://x", headers={}, json={})
    assert resp.status_code == 200
    assert calls["n"] == 3


def test_retries_on_500_then_raises(monkeypatch):
    calls = {"n": 0}

    def fake_post(url, headers=None, json=None, timeout=None):
        calls["n"] += 1
        return _FakeResp(status=500)

    monkeypatch.setattr("httpx.post", fake_post)
    with pytest.raises(__import__("httpx").HTTPStatusError):
        _post_json_with_retry("http://x", headers={}, json={})
    assert calls["n"] == 3  # 3 attempts, no more


def test_no_retry_on_4xx_auth_errors(monkeypatch):
    calls = {"n": 0}

    def fake_post(url, headers=None, json=None, timeout=None):
        calls["n"] += 1
        return _FakeResp(status=401)

    monkeypatch.setattr("httpx.post", fake_post)
    resp = _post_json_with_retry("http://x", headers={}, json={})
    assert resp.status_code == 401
    assert calls["n"] == 1  # never retried — fail fast, don't burn budget
