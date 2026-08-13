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


def test_prod_accepts_strong_token():
    s = Settings(
        env="production",
        api_token="x" * 40,
        cors_origins=["https://app.example.com"],
        llm="auto",
    )
    assert s.api_token == "x" * 40


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