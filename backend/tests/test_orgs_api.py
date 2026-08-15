"""Tests: org membership provisioning + org-scoped visibility (Task 3)."""

from fastapi.testclient import TestClient

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


def _auth(principal=None, tenant=None, role=None):
    headers = {"Authorization": f"Bearer {TOKEN}"}
    if principal:
        headers["x-solven-principal"] = principal
    if tenant:
        headers["x-solven-tenant"] = tenant
    if role:
        headers["x-solven-role"] = role
    return headers


def _submit(client, principal, tenant=None, role=None, agent="lesson-plan"):
    return client.post(
        "/api/coordinator",
        json={"agent": agent, "input": "x"},
        headers=_auth(principal, tenant, role),
    )


def test_production_submit_provisions_org_and_membership(monkeypatch, db_url, store, prod_db_url):
    client = TestClient(_prod_app(monkeypatch, db_url, store, prod_db_url))
    r = _submit(client, "teacher-a", "org-1")
    assert r.status_code == 200
    with store._c() as conn:
        org = conn.execute(
            "SELECT name, plan FROM orgs WHERE id=%s", ("org-1",)
        ).fetchone()
        member = conn.execute(
            "SELECT role FROM org_members WHERE user_id=%s AND org_id=%s",
            ("teacher-a", "org-1"),
        ).fetchone()
    assert org["name"] == "org-1"
    assert org["plan"] == "trial"
    assert member["role"] == "teacher"


def test_production_submit_without_tenant_writes_org_id_null(monkeypatch, db_url, store, prod_db_url):
    """Tenant-less production requests still work: draft written with org_id=None,
    quota skipped (documented behavior — the edge must set tenant in practice)."""
    client = TestClient(_prod_app(monkeypatch, db_url, store, prod_db_url))
    r = _submit(client, "teacher-a")
    assert r.status_code == 200
    with store._c() as conn:
        row = conn.execute(
            "SELECT org_id FROM drafts WHERE teacher_id=%s", ("teacher-a",)
        ).fetchone()
        count = conn.execute("SELECT COUNT(*) AS count FROM usage_counters").fetchone()
    assert row["org_id"] is None
    assert count["count"] == 0


def test_cross_org_isolation(monkeypatch, db_url, store, prod_db_url):
    """Teacher B in org-2 cannot see/act on teacher A's org-1 draft."""
    client = TestClient(_prod_app(monkeypatch, db_url, store, prod_db_url))
    d = _submit(client, "teacher-a", "org-1").json()
    # list: B sees nothing
    r = client.get("/api/drafts", headers=_auth("teacher-b", "org-2"))
    assert r.json() == []
    # PATCH: 403
    r = client.patch(
        f"/api/drafts/{d['id']}",
        json={"status": "approved"},
        headers=_auth("teacher-b", "org-2"),
    )
    assert r.status_code == 403
    # DELETE: 403
    r = client.delete(f"/api/drafts/{d['id']}", headers=_auth("teacher-b", "org-2"))
    assert r.status_code == 403


def test_same_org_teachers_see_own_drafts(monkeypatch, db_url, store, prod_db_url):
    """Same org, different teachers: each sees their own drafts (teacher+org
    scoped per design: 'a teacher can only see/act on drafts inside their own
    org' — visibility is per-teacher within the org)."""
    client = TestClient(_prod_app(monkeypatch, db_url, store, prod_db_url))
    d_a = _submit(client, "teacher-a", "org-1").json()
    d_b = _submit(client, "teacher-b", "org-1").json()
    r = client.get("/api/drafts", headers=_auth("teacher-a", "org-1"))
    assert [x["id"] for x in r.json()] == [d_a["id"]]
    r = client.get("/api/drafts", headers=_auth("teacher-b", "org-1"))
    assert [x["id"] for x in r.json()] == [d_b["id"]]


def test_role_header_stored(monkeypatch, db_url, store, prod_db_url):
    client = TestClient(_prod_app(monkeypatch, db_url, store, prod_db_url))
    r = _submit(client, "teacher-a", "org-1", role="owner")
    assert r.status_code == 200
    with store._c() as conn:
        member = conn.execute(
            "SELECT role FROM org_members WHERE user_id=%s AND org_id=%s",
            ("teacher-a", "org-1"),
        ).fetchone()
    assert member["role"] == "owner"