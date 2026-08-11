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
