"""Tests: quota enforcement (402) + internal billing webhook (Task 3)."""

from datetime import datetime, timezone

from fastapi.testclient import TestClient

from app.billing import PLAN_QUOTAS, quota_for_plan
from app.config import Settings
from app.main import create_app

TOKEN = "x" * 40


def _prod_app(monkeypatch, db_url, store, prod_db_url):
    monkeypatch.setenv("ANTHROPIC_API_KEY", "test-key")
    return create_app(
        Settings(
            api_token=TOKEN,
            database_url=prod_db_url,
            env="production",
            llm="anthropic",
            cors_origins=["https://app.example.com"],
        )
    )


def _auth(principal=None, tenant=None):
    headers = {"Authorization": f"Bearer {TOKEN}"}
    if principal:
        headers["x-solven-principal"] = principal
    if tenant:
        headers["x-solven-tenant"] = tenant
    return headers


def _submit(client, principal, tenant, agent="lesson-plan"):
    return client.post(
        "/api/coordinator",
        json={"agent": agent, "input": "x"},
        headers=_auth(principal, tenant),
    )


def test_quota_for_plan_mapping():
    assert quota_for_plan("trial") == 50
    assert quota_for_plan("pro") == 1000
    assert quota_for_plan("unknown-plan") == 50
    assert PLAN_QUOTAS == {"trial": 50, "pro": 1000}


def test_quota_allowed_increments_usage(monkeypatch, db_url, store, prod_db_url):
    client = TestClient(_prod_app(monkeypatch, db_url, store, prod_db_url))
    r = _submit(client, "teacher-a", "org-1")
    assert r.status_code == 200
    with store._c() as conn:
        row = conn.execute(
            "SELECT count, quota FROM usage_counters WHERE org_id=%s", ("org-1",)
        ).fetchone()
    assert row["count"] == 1
    assert row["quota"] == 50


def test_quota_blocked_returns_402(monkeypatch, db_url, store, prod_db_url):
    client = TestClient(_prod_app(monkeypatch, db_url, store, prod_db_url))
    store.ensure_org("org-1", "School A")
    period = datetime.now(timezone.utc).strftime("%Y-%m")
    for _ in range(49):
        store.increment_usage("org-1", period, quota=50)
    # 50th submit → count 50, still allowed (50 > 50 is False)
    r = _submit(client, "teacher-a", "org-1")
    assert r.status_code == 200
    # 51st submit → 402
    r = _submit(client, "teacher-a", "org-1")
    assert r.status_code == 402


def test_dev_mode_no_quota_enforcement(db_url, store):
    client = TestClient(
        create_app(Settings(api_token="test-token", database_url=db_url, env="dev"))
    )
    r = client.post(
        "/api/coordinator",
        json={"agent": "lesson-plan", "input": "x"},
        headers={"Authorization": "Bearer test-token"},
    )
    assert r.status_code == 200
    with store._c() as conn:
        row = conn.execute("SELECT COUNT(*) AS count FROM usage_counters").fetchone()
    assert row["count"] == 0


def test_webhook_dedup_and_subscription_sync(monkeypatch, db_url, store, prod_db_url):
    client = TestClient(_prod_app(monkeypatch, db_url, store, prod_db_url))
    store.ensure_org("org-1", "School A")
    payload = {
        "event_id": "evt_1",
        "type": "customer.subscription.updated",
        "data": {
            "org_id": "org-1",
            "stripe_sub_id": "sub_1",
            "status": "active",
            "period_end": "2026-09-01T00:00:00Z",
            "plan": "pro",
            "customer_id": "cus_1",
        },
    }
    r = client.post("/api/internal/billing/webhook", json=payload, headers=_auth())
    assert r.status_code == 200
    assert r.json() == {"received": True}
    # duplicate event id → dedup, no re-apply
    r = client.post("/api/internal/billing/webhook", json=payload, headers=_auth())
    assert r.json() == {"received": True, "duplicate": True}
    with store._c() as conn:
        sub = conn.execute(
            "SELECT stripe_sub_id, status FROM subscriptions WHERE org_id=%s", ("org-1",)
        ).fetchone()
        plan = conn.execute("SELECT plan FROM orgs WHERE id=%s", ("org-1",)).fetchone()
        cust = conn.execute(
            "SELECT stripe_customer_id FROM orgs WHERE id=%s", ("org-1",)
        ).fetchone()
    assert sub["stripe_sub_id"] == "sub_1"
    assert sub["status"] == "active"
    assert plan["plan"] == "pro"
    assert cust["stripe_customer_id"] == "cus_1"


def test_webhook_deleted_sets_canceled(monkeypatch, db_url, store, prod_db_url):
    client = TestClient(_prod_app(monkeypatch, db_url, store, prod_db_url))
    store.ensure_org("org-1", "School A")
    r = client.post(
        "/api/internal/billing/webhook",
        json={
            "event_id": "evt_2",
            "type": "customer.subscription.deleted",
            "data": {
                "org_id": "org-1",
                "stripe_sub_id": "sub_1",
                "period_end": "2026-09-01T00:00:00Z",
            },
        },
        headers=_auth(),
    )
    assert r.json() == {"received": True}
    with store._c() as conn:
        sub = conn.execute(
            "SELECT status FROM subscriptions WHERE org_id=%s", ("org-1",)
        ).fetchone()
    assert sub["status"] == "canceled"


def test_webhook_without_org_id_skipped(monkeypatch, db_url, store, prod_db_url):
    client = TestClient(_prod_app(monkeypatch, db_url, store, prod_db_url))
    r = client.post(
        "/api/internal/billing/webhook",
        json={"event_id": "evt_3", "type": "customer.subscription.updated", "data": {}},
        headers=_auth(),
    )
    assert r.json() == {"received": True, "skipped": "no org_id"}


def test_billing_customer_endpoint(monkeypatch, db_url, store, prod_db_url):
    client = TestClient(_prod_app(monkeypatch, db_url, store, prod_db_url))
    store.ensure_org("org-1", "School A")
    r = client.get(
        "/api/internal/billing/customer", params={"org_id": "org-1"}, headers=_auth()
    )
    assert r.status_code == 404
    store.set_org_stripe_customer("org-1", "cus_1")
    r = client.get(
        "/api/internal/billing/customer", params={"org_id": "org-1"}, headers=_auth()
    )
    assert r.status_code == 200
    assert r.json() == {"customer_id": "cus_1"}