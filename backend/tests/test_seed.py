"""Tests: demo dataset seeding (dev/demo only — never in production)."""

from fastapi.testclient import TestClient

from app.config import Settings
from app.main import create_app


def _dev_client():
    return TestClient(
        create_app(Settings(api_token="test-token", db_path=":memory:", env="dev"))
    )


def _prod_client(monkeypatch):
    monkeypatch.setenv("ANTHROPIC_API_KEY", "test-key")
    return TestClient(
        create_app(
            Settings(
                api_token="x" * 40,
                db_path=":memory:",
                env="production",
                llm="anthropic",
                cors_origins=["https://app.example.com"],
            )
        )
    )


def _auth(token: str = "test-token") -> dict:
    return {"Authorization": f"Bearer {token}"}


def test_demo_seed_creates_full_dataset():
    client = _dev_client()
    r = client.post("/api/demo/seed", headers=_auth())
    assert r.status_code == 200
    body = r.json()
    assert body["seeded"] >= 8

    drafts = client.get("/api/drafts", headers=_auth()).json()
    assert len(drafts) >= 8

    # dataset covers every workflow state
    statuses = {d["status"] for d in drafts}
    assert {"pending", "approved", "rejected", "quarantined"} <= statuses

    # quarantine draft carries a visible guardrail warning
    quarantined = [d for d in drafts if d["status"] == "quarantined"]
    assert quarantined and any("เบอร์โทร" in w for d in quarantined for w in d["warnings"])

    # approved drafts record the reviewer
    approved = [d for d in drafts if d["status"] == "approved"]
    assert approved and all(d.get("reviewedBy") for d in approved)


def test_demo_seed_populates_audit_trail():
    client = _dev_client()
    client.post("/api/demo/seed", headers=_auth())
    runs = client.get("/api/audit", headers=_auth()).json()
    assert len(runs) >= 8
    assert all(r["status"] in ("completed", "fallback-mock") for r in runs)


def test_demo_seed_is_404_in_production(monkeypatch):
    client = _prod_client(monkeypatch)
    r = client.post(
        "/api/demo/seed",
        headers={"Authorization": f"Bearer {'x' * 40}", "x-solven-principal": "teacher-a"},
    )
    assert r.status_code == 404


def test_demo_seed_requires_token():
    client = _dev_client()
    r = client.post("/api/demo/seed")
    assert r.status_code == 401
