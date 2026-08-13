"""Tests: enterprise security layer — auth, rate limiting, security headers, request IDs.

These tests are written BEFORE the implementation (TDD red phase):
- no auth dependency exists yet (routes are open)
- no rate limiter exists
- no security headers middleware exists
- no request-id middleware exists
"""

import pytest
from fastapi.testclient import TestClient

from app.config import Settings
from app.main import create_app


def make_client(**overrides) -> tuple[TestClient, Settings]:
    # default to an isolated in-memory DB so tests never share backend/data/solven.db
    overrides.setdefault("db_path", ":memory:")
    settings = Settings(**overrides)
    return TestClient(create_app(settings)), settings


def auth(token: str) -> dict:
    return {"Authorization": f"Bearer {token}"}


# ---------------------------------------------------------------- auth
def test_health_is_public_no_token():
    client, _ = make_client()
    r = client.get("/health")
    assert r.status_code == 200


def test_api_requires_token():
    client, settings = make_client()
    r = client.post(
        "/api/coordinator", json={"agent": "grading", "input": "คำตอบ"}
    )
    assert r.status_code == 401


def test_api_rejects_wrong_token():
    client, settings = make_client()
    r = client.post(
        "/api/coordinator",
        json={"agent": "grading", "input": "คำตอบ"},
        headers=auth("wrong-token"),
    )
    assert r.status_code == 401


def test_api_accepts_valid_token():
    client, settings = make_client(api_token="test-token")
    r = client.post(
        "/api/coordinator",
        json={"agent": "grading", "input": "คำตอบ", "rubric": "เกณฑ์"},
        headers=auth("test-token"),
    )
    assert r.status_code == 200
    assert r.json()["status"] == "pending"


def test_api_rejects_garbage_auth_scheme():
    client, settings = make_client(api_token="test-token")
    r = client.post(
        "/api/coordinator",
        json={"agent": "grading", "input": "คำตอบ"},
        headers={"Authorization": "Basic abc"},
    )
    assert r.status_code in (401, 403)


# ---------------------------------------------------------------- rate limit
def test_drafts_pagination_bounded():
    """T2-02: list endpoints paginate with a bounded page size."""
    client, _ = make_client(api_token="test-token")
    for i in range(5):
        r = client.post(
            "/api/coordinator",
            json={"agent": "lesson-plan", "input": f"หัวข้อ {i}"},
            headers=auth("test-token"),
        )
        assert r.status_code == 200
    r = client.get("/api/drafts?limit=2&offset=0", headers=auth("test-token"))
    assert len(r.json()) == 2
    r = client.get("/api/drafts?limit=1000", headers=auth("test-token"))
    assert len(r.json()) == 5  # bounded at 500, we only have 5
    r = client.get("/api/drafts?limit=0", headers=auth("test-token"))
    assert len(r.json()) == 1  # clamped to min 1


def test_rate_limit_429_after_limit():
    client, settings = make_client(rate_limit_per_min=3)
    for _ in range(3):
        r = client.get("/health")
        assert r.status_code == 200
    r4 = client.get("/health")
    assert r4.status_code == 429


def test_rate_limit_resets_after_window():
    from app.middleware import _WINDOW_SECONDS

    client, settings = make_client(rate_limit_per_min=2)
    client.get("/health")
    client.get("/health")
    assert client.get("/health").status_code == 429
    # simulate window expiry
    from app.middleware import _buckets

    _buckets.clear()
    assert client.get("/health").status_code == 200


# ---------------------------------------------------------------- security headers
def test_security_headers_present():
    client, _ = make_client()
    r = client.get("/health")
    assert r.headers.get("x-content-type-options") == "nosniff"
    assert r.headers.get("x-frame-options") == "DENY"
    assert r.headers.get("referrer-policy") in ("no-referrer", "strict-origin-when-cross-origin")
    assert "default-src" in r.headers.get("content-security-policy", "")


# ---------------------------------------------------------------- request id
def test_request_id_echoed():
    client, _ = make_client()
    r = client.get("/health", headers={"X-Request-ID": "req-123"})
    assert r.headers.get("x-request-id") == "req-123"


def test_request_id_generated_when_missing():
    client, _ = make_client()
    r = client.get("/health")
    assert r.headers.get("x-request-id")
