"""Tests: release preflight (production secret/URL/CORS/LLM gate)."""

from app.config import Settings
from app.preflight import check


def test_check_passes_for_good_values():
    s = Settings(env="dev", api_token="x" * 40, cors_origins=["https://app.example.com"], llm="auto")
    assert check(s, site_url="https://app.example.com") == []


def test_check_rejects_placeholder_site_url():
    s = Settings(env="dev", api_token="x" * 40)
    msgs = check(s, site_url="https://solven.example.com")
    assert msgs and any("site_url" in m for m in msgs)


def test_check_rejects_missing_site_url():
    s = Settings(env="dev", api_token="x" * 40)
    assert check(s, site_url=None)


def test_check_rejects_bad_token():
    s = Settings(env="dev", api_token="dev-secret-change-me")
    assert check(s, site_url="https://app.example.com")


def test_check_rejects_localhost_cors():
    s = Settings(env="dev", api_token="x" * 40, cors_origins=["http://localhost:3000"])
    assert check(s, site_url="https://app.example.com")


def test_check_rejects_mock_llm():
    s = Settings(env="dev", api_token="x" * 40, llm="mock")
    assert check(s, site_url="https://app.example.com")


def test_check_catches_env_errors_via_settings_construction(monkeypatch):
    # env-driven Settings() construction inside check() collects ValidationError
    monkeypatch.delenv("SOLVEN_API_TOKEN", raising=False)
    monkeypatch.setenv("SOLVEN_ENV", "production")
    monkeypatch.setenv("SOLVEN_LLM", "mock")
    s = Settings(env="dev", api_token="x" * 40)
    msgs = check(s, site_url="https://app.example.com")
    assert msgs  # env-driven production construction fails on default token + mock