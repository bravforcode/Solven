"""Tests: demo dataset seeding (dev/demo only — never in production)."""

from fastapi.testclient import TestClient

from app.config import Settings
from app.main import create_app


def _dev_client(db_url, store):
    return TestClient(
        create_app(Settings(api_token="test-token", database_url=db_url, env="dev"))
    )


def _prod_client(monkeypatch, db_url, store, prod_db_url):
    monkeypatch.setenv("ANTHROPIC_API_KEY", "test-key")
    return TestClient(
        create_app(
            Settings(
                api_token="x" * 40,
                database_url=prod_db_url,
                env="production",
                llm="anthropic",
                cors_origins=["https://app.example.com"],
            )
        )
    )


def _auth(token: str = "test-token") -> dict:
    return {"Authorization": f"Bearer {token}"}


def test_demo_seed_creates_full_dataset(db_url, store):
    client = _dev_client(db_url, store)
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


def test_demo_seed_populates_audit_trail(db_url, store):
    client = _dev_client(db_url, store)
    client.post("/api/demo/seed", headers=_auth())
    runs = client.get("/api/audit", headers=_auth()).json()
    assert len(runs) >= 8
    assert all(r["status"] in ("completed", "fallback-mock") for r in runs)


def test_demo_seed_is_404_in_production(monkeypatch, db_url, store, prod_db_url):
    client = _prod_client(monkeypatch, db_url, store, prod_db_url)
    r = client.post(
        "/api/demo/seed",
        headers={"Authorization": f"Bearer {'x' * 40}", "x-solven-principal": "teacher-a"},
    )
    assert r.status_code == 404


def test_demo_seed_requires_token(db_url, store):
    client = _dev_client(db_url, store)
    r = client.post("/api/demo/seed")
    assert r.status_code == 401