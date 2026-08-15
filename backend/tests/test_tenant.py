"""Tests: principal/tenant vertical slice (AUD-C-03, AUD-H-01, ARCH-03).

Production requires an edge-injected `x-solven-principal` header; drafts are
scoped to the authenticated teacher and ownership is enforced on review.
Dev/demo mode uses a fixed demo-teacher identity (no header required).
"""

import pytest
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


def _auth(principal=None, tenant=None):
    headers = {"Authorization": f"Bearer {TOKEN}"}
    if principal:
        headers["x-solven-principal"] = principal
    if tenant:
        headers["x-solven-tenant"] = tenant
    return headers


def _submit(client, principal, tenant=None, agent="grading", rubric="เกณฑ์"):
    return client.post(
        "/api/coordinator",
        json={"agent": agent, "input": "x", "rubric": rubric},
        headers=_auth(principal, tenant),
    )


def test_production_requires_principal(monkeypatch, db_url, store, prod_db_url):
    client = TestClient(_prod_app(monkeypatch, db_url, store, prod_db_url))
    # no principal header -> 401
    r = client.post(
        "/api/coordinator",
        json={"agent": "lesson-plan", "input": "x"},
        headers={"Authorization": f"Bearer {TOKEN}"},
    )
    assert r.status_code == 401
    r = client.get("/api/drafts", headers={"Authorization": f"Bearer {TOKEN}"})
    assert r.status_code == 401


def test_production_submit_and_list_scoped_to_principal(monkeypatch, db_url, store, prod_db_url):
    client = TestClient(_prod_app(monkeypatch, db_url, store, prod_db_url))
    d = _submit(client, "teacher-a").json()
    assert d["status"] == "pending"

    # teacher A sees their draft
    r = client.get("/api/drafts", headers=_auth("teacher-a"))
    assert [x["id"] for x in r.json()] == [d["id"]]

    # teacher B sees nothing
    r = client.get("/api/drafts", headers=_auth("teacher-b"))
    assert r.json() == []


def test_production_teacher_cannot_review_others_draft(monkeypatch, db_url, store, prod_db_url):
    client = TestClient(_prod_app(monkeypatch, db_url, store, prod_db_url))
    d = _submit(client, "teacher-a").json()

    r = client.patch(
        f"/api/drafts/{d['id']}",
        json={"status": "approved"},
        headers=_auth("teacher-b"),
    )
    assert r.status_code == 403

    # owner can review
    r = client.patch(
        f"/api/drafts/{d['id']}",
        json={"status": "approved"},
        headers=_auth("teacher-a"),
    )
    assert r.status_code == 200
    assert r.json()["status"] == "approved"


def test_production_same_teacher_cross_org_cannot_act(monkeypatch, db_url, store, prod_db_url):
    """Org dimension of ownership: the same teacher in a different org cannot
    act on a draft created under another org (design: 'a teacher can only
    see/act on drafts inside their own org')."""
    client = TestClient(_prod_app(monkeypatch, db_url, store, prod_db_url))
    d = _submit(client, "teacher-a", tenant="org-1").json()

    r = client.patch(
        f"/api/drafts/{d['id']}",
        json={"status": "approved"},
        headers=_auth("teacher-a", "org-2"),
    )
    # RLS makes the cross-org row invisible: 404 (row not found) or 403
    # (ownership check) — both fail closed, never data (Task 19 Step 2).
    assert r.status_code in (403, 404), r.text

    r = client.delete(f"/api/drafts/{d['id']}", headers=_auth("teacher-a", "org-2"))
    assert r.status_code in (403, 404), r.text

    # same teacher, same org → allowed
    r = client.patch(
        f"/api/drafts/{d['id']}",
        json={"status": "approved"},
        headers=_auth("teacher-a", "org-1"),
    )
    assert r.status_code == 200


def test_production_replay_cannot_leak_another_teachers_draft(monkeypatch, db_url, store, prod_db_url):
    """C1: teacher B reusing A's client_task_id must NOT receive A's draft."""
    client = TestClient(_prod_app(monkeypatch, db_url, store, prod_db_url))
    fixed_task_id = "task-a-001"
    d = client.post(
        "/api/coordinator",
        json={
            "agent": "lesson-plan",
            "input": "A's secret input",
            "client_task_id": fixed_task_id,
        },
        headers=_auth("teacher-a"),
    ).json()
    assert d["id"]

    # teacher B reuses A's client_task_id → must be refused (no leak, no 200)
    r = client.post(
        "/api/coordinator",
        json={"agent": "lesson-plan", "input": "B's own input", "client_task_id": fixed_task_id},
        headers=_auth("teacher-b"),
    )
    assert r.status_code == 403, r.text
    assert "replay" in r.text.lower() or "another teacher" in r.text.lower()

    # owner replay still returns the same draft (idempotent retry)
    r = client.post(
        "/api/coordinator",
        json={"agent": "lesson-plan", "input": "x", "client_task_id": fixed_task_id},
        headers=_auth("teacher-a"),
    )
    assert r.status_code == 200
    assert r.json()["id"] == d["id"]


def test_production_audit_scoped_to_teacher(monkeypatch, db_url, store, prod_db_url):
    """I2: audit trail must not leak another teacher's runs."""
    client = TestClient(_prod_app(monkeypatch, db_url, store, prod_db_url))
    _submit(client, "teacher-a", agent="lesson-plan")
    _submit(client, "teacher-b", agent="lesson-plan")

    runs_a = client.get("/api/audit", headers=_auth("teacher-a")).json()
    runs_b = client.get("/api/audit", headers=_auth("teacher-b")).json()
    assert runs_a and runs_b
    assert len(runs_a) == 1 and len(runs_b) == 1


def test_in_flight_duplicate_returns_409(monkeypatch, db_url, store):
    """T1-10: same-teacher duplicate while task exists but draft not yet made."""
    from app.coordinator import InFlightError, run_task
    from app.db import Store

    store.create_task("task-inflight", "lesson-plan", "x", teacher_id="t1")
    try:
        run_task(store, "lesson-plan", "x", client_task_id="task-inflight", teacher_id="t1")
        assert False, "expected InFlightError"
    except InFlightError:
        pass


def test_retention_purges_expired_only(db_url, store):
    """T1-09: purge removes drafts older than the window, keeps fresh ones."""
    import datetime

    store.add_draft("old", "t-old", "lesson-plan", "in", "out", teacher_id="t1")
    store.add_draft("new", "t-new", "lesson-plan", "in", "out", teacher_id="t1")
    old = datetime.datetime(2000, 1, 1, tzinfo=datetime.timezone.utc).isoformat()
    with store._c() as conn:
        conn.execute("UPDATE drafts SET created_at=%s WHERE id='old'", (old,))
        conn.execute("UPDATE tasks SET created_at=%s WHERE id='t-old'", (old,))

    purged = store.purge_expired(retention_days=180)
    assert purged == 1
    assert store.get_draft("old") is None
    assert store.get_draft("new") is not None
    # orphaned task + audit rows are gone too
    with store._c() as conn:
        assert conn.execute("SELECT COUNT(*) AS count FROM tasks WHERE id='t-old'").fetchone()["count"] == 0


def test_delete_draft_scoped(monkeypatch, db_url, store, prod_db_url):
    """T1-09: DELETE is owner-only in production; 404 for unknown."""
    client = TestClient(_prod_app(monkeypatch, db_url, store, prod_db_url))
    d = _submit(client, "teacher-a", agent="lesson-plan").json()

    r = client.delete(f"/api/drafts/{d['id']}", headers=_auth("teacher-b"))
    assert r.status_code == 403

    r = client.delete(f"/api/drafts/{d['id']}", headers=_auth("teacher-a"))
    assert r.status_code == 200
    assert r.json()["deleted"] == d["id"]

    r = client.delete(f"/api/drafts/{d['id']}", headers=_auth("teacher-a"))
    assert r.status_code == 404


def test_dev_mode_uses_demo_teacher_without_header(db_url, store):
    client = TestClient(
        create_app(Settings(api_token="test-token", database_url=db_url, env="dev"))
    )
    r = client.post(
        "/api/coordinator",
        json={"agent": "grading", "input": "x", "rubric": "เกณฑ์"},
        headers={"Authorization": "Bearer test-token"},
    )
    assert r.status_code == 200
    r = client.get("/api/drafts", headers={"Authorization": "Bearer test-token"})
    assert r.status_code == 200


# ---- RLS defense-in-depth (migration 005) ----
# The app-level scoping tests above prove the code path is correct; these
# prove the DATABASE fails closed even when application filtering is bypassed.
# They connect as `solven_app` (non-superuser role created by migration 005):
# RLS is BYPASSED for superusers by Postgres design, so superuser connections
# cannot prove anything about RLS. Local compose runs as superuser (dormant
# RLS); production must use a non-superuser role — which these tests enforce.

RLS_APP_URL = "postgresql://solven_app:solven_app@localhost:5432/solven_test"


def test_rls_raw_query_cannot_cross_tenants(monkeypatch, db_url, store, prod_db_url):
    """A raw SQL query (no app-level WHERE) must still be tenant-isolated:
    RLS fail-closes on the session scope."""
    import os

    import psycopg
    from psycopg.rows import dict_row

    app_url = os.environ.get("SOLVEN_TEST_DATABASE_URL", db_url).replace(
        "solven:solven@", "solven_app:solven_app@"
    )

    client = TestClient(_prod_app(monkeypatch, db_url, store, prod_db_url))
    d = _submit(client, "teacher-a", tenant="org-a").json()
    assert d["id"]

    # scoped as org-b: org-a's draft is invisible even without a WHERE clause
    with psycopg.connect(app_url, row_factory=dict_row) as conn:
        conn.execute("SET app.current_org_id = 'org-b'")
        rows = conn.execute("SELECT * FROM drafts").fetchall()
    assert all(r["org_id"] == "org-b" for r in rows)
    assert d["id"] not in [r["id"] for r in rows]

    # unscoped: only NULL-org demo rows, never org-a's
    with psycopg.connect(app_url, row_factory=dict_row) as conn:
        rows = conn.execute("SELECT * FROM drafts").fetchall()
    assert all(r["org_id"] is None for r in rows)
    assert d["id"] not in [r["id"] for r in rows]

    # scoped as org-a: visible
    with psycopg.connect(app_url, row_factory=dict_row) as conn:
        conn.execute("SET app.current_org_id = 'org-a'")
        rows = conn.execute("SELECT * FROM drafts").fetchall()
    assert d["id"] in [r["id"] for r in rows]


def test_rls_write_requires_matching_scope(db_url, store):
    """WITH CHECK: inserting an org-scoped row without the matching session
    scope is rejected by the database itself (42501), not by application code."""
    import os

    import psycopg
    from psycopg.rows import dict_row

    app_url = os.environ.get("SOLVEN_TEST_DATABASE_URL", db_url).replace(
        "solven:solven@", "solven_app:solven_app@"
    )

    with pytest.raises(psycopg.errors.InsufficientPrivilege):
        with psycopg.connect(app_url, row_factory=dict_row) as conn:
            conn.execute(
                "INSERT INTO drafts (id, task_id, agent, input, output, status, warnings, created_at, org_id) "
                "VALUES ('rls-bad', 't-bad', 'grading', 'in', 'out', 'pending', '[]', "
                "'2026-01-01T00:00:00+00:00', 'org-zzz')"
            )


def test_rls_platform_scope_sees_all_tenants(monkeypatch, db_url, store, prod_db_url):
    """Platform operations (retention purge, rollups) legitimately cross
    tenants via the explicit 'platform' scope."""
    import os

    import psycopg
    from psycopg.rows import dict_row

    app_url = os.environ.get("SOLVEN_TEST_DATABASE_URL", db_url).replace(
        "solven:solven@", "solven_app:solven_app@"
    )

    client = TestClient(_prod_app(monkeypatch, db_url, store, prod_db_url))
    _submit(client, "teacher-a", tenant="org-a")
    _submit(client, "teacher-b", tenant="org-b")

    with psycopg.connect(app_url, row_factory=dict_row) as conn:
        conn.execute("SET app.current_org_id = 'platform'")
        rows = conn.execute("SELECT * FROM drafts").fetchall()
    assert len(rows) >= 2