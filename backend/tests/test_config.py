"""Tests: settings/config validation (enterprise-grade configuration)."""

import pytest

from app.config import Settings


def test_defaults_applied():
    s = Settings()
    assert s.api_token  # non-empty
    assert s.rate_limit_per_min > 0
    assert isinstance(s.cors_origins, list)


def test_token_from_env(monkeypatch):
    monkeypatch.setenv("SOLVEN_API_TOKEN", "env-secret")
    s = Settings()
    assert s.api_token == "env-secret"


def test_cors_origins_parsed_from_comma_string(monkeypatch):
    monkeypatch.setenv("SOLVEN_CORS_ORIGINS", "https://a.example,https://b.example")
    s = Settings()
    assert s.cors_origins == ["https://a.example", "https://b.example"]


def test_rate_limit_must_be_positive():
    with pytest.raises(Exception):
        Settings(rate_limit_per_min=0)


def test_token_must_not_be_blank():
    with pytest.raises(Exception):
        Settings(api_token="   ")


# --- production (env == "production") gates ---


def test_prod_rejects_default_token():
    with pytest.raises(Exception):
        Settings(env="production", api_token="dev-secret-change-me")


def test_prod_rejects_short_token():
    with pytest.raises(Exception):
        Settings(env="production", api_token="short")


def test_prod_rejects_known_default_tokens():
    for bad in ("test-token", "changeme"):
        with pytest.raises(Exception):
            Settings(env="production", api_token=bad)


def test_prod_accepts_strong_token(monkeypatch):
    monkeypatch.setenv("ANTHROPIC_API_KEY", "test-key")
    s = Settings(
        env="production",
        api_token="x" * 40,
        cors_origins=["https://app.example.com"],
        llm="auto",
    )
    assert s.api_token == "x" * 40


def test_prod_accepts_exactly_32_char_token(monkeypatch):
    monkeypatch.setenv("ANTHROPIC_API_KEY", "test-key")
    s = Settings(
        env="production",
        api_token="a" * 32,
        cors_origins=["https://app.example.com"],
        llm="auto",
    )
    assert s.api_token == "a" * 32


def test_prod_rejects_example_env_token():
    # the token documented in .env.example is public knowledge → must be rejected
    with pytest.raises(Exception):
        Settings(env="production", api_token="change-me-to-a-long-random-string")


def test_prod_requires_provider_key_for_non_mock_llm(monkeypatch):
    monkeypatch.delenv("ANTHROPIC_API_KEY", raising=False)
    monkeypatch.delenv("OPENAI_API_KEY", raising=False)
    with pytest.raises(Exception):
        Settings(env="production", api_token="x" * 40, llm="anthropic")
    with pytest.raises(Exception):
        Settings(env="production", api_token="x" * 40, llm="auto")


def test_prod_accepts_llm_when_provider_key_present(monkeypatch):
    monkeypatch.setenv("OPENAI_API_KEY", "test-key")
    s = Settings(
        env="production",
        api_token="x" * 40,
        cors_origins=["https://app.example.com"],
        llm="openai",
    )
    assert s.llm == "openai"


def test_prod_rejects_localhost_cors():
    with pytest.raises(Exception):
        Settings(env="production", api_token="x" * 40, cors_origins=["http://localhost:3000"])
    with pytest.raises(Exception):
        Settings(env="production", api_token="x" * 40, cors_origins=["http://127.0.0.1:3000"])


def test_prod_rejects_mock_llm():
    with pytest.raises(Exception):
        Settings(env="production", api_token="x" * 40, llm="mock")


def test_invalid_env_rejected():
    with pytest.raises(Exception):
        Settings(env="staging")


def test_dev_keeps_default_behavior():
    # dev mode: default token, localhost CORS and mock LLM all still allowed
    s = Settings(env="dev")
    assert s.api_token == "dev-secret-change-me"
    assert s.cors_origins == ["http://localhost:3000"]
    assert s.llm == "mock"