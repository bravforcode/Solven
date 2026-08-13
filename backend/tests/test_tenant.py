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


def _prod_app(monkeypatch):
    monkeypatch.setenv("ANTHROPIC_API_KEY", "test-key")
    return create_app(
        Settings(
            api_token=TOKEN,
            db_path=":memory:",
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


def _submit(client, principal, agent="grading", rubric="เกณฑ์"):
    return client.post(
        "/api/coordinator",
        json={"agent": agent, "input": "x", "rubric": rubric},
        headers=_auth(principal),
    )


def test_production_requires_principal(monkeypatch):
    client = TestClient(_prod_app(monkeypatch))
    # no principal header -> 401
    r = client.post(
        "/api/coordinator",
        json={"agent": "lesson-plan", "input": "x"},
        headers={"Authorization": f"Bearer {TOKEN}"},
    )
    assert r.status_code == 401
    r = client.get("/api/drafts", headers={"Authorization": f"Bearer {TOKEN}"})
    assert r.status_code == 401


def test_production_submit_and_list_scoped_to_principal(monkeypatch):
    client = TestClient(_prod_app(monkeypatch))
    d = _submit(client, "teacher-a").json()
    assert d["status"] == "pending"

    # teacher A sees their draft
    r = client.get("/api/drafts", headers=_auth("teacher-a"))
    assert [x["id"] for x in r.json()] == [d["id"]]

    # teacher B sees nothing
    r = client.get("/api/drafts", headers=_auth("teacher-b"))
    assert r.json() == []


def test_production_teacher_cannot_review_others_draft(monkeypatch):
    client = TestClient(_prod_app(monkeypatch))
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


def test_production_replay_cannot_leak_another_teachers_draft(monkeypatch):
    """C1: teacher B reusing A's client_task_id must NOT receive A's draft."""
    client = TestClient(_prod_app(monkeypatch))
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


def test_production_audit_scoped_to_teacher(monkeypatch):
    """I2: audit trail must not leak another teacher's runs."""
    client = TestClient(_prod_app(monkeypatch))
    _submit(client, "teacher-a", agent="lesson-plan")
    _submit(client, "teacher-b", agent="lesson-plan")

    runs_a = client.get("/api/audit", headers=_auth("teacher-a")).json()
    runs_b = client.get("/api/audit", headers=_auth("teacher-b")).json()
    assert runs_a and runs_b
    assert len(runs_a) == 1 and len(runs_b) == 1


def test_dev_mode_uses_demo_teacher_without_header():
    client = TestClient(
        create_app(Settings(api_token="test-token", db_path=":memory:", env="dev"))
    )
    r = client.post(
        "/api/coordinator",
        json={"agent": "grading", "input": "x", "rubric": "เกณฑ์"},
        headers={"Authorization": "Bearer test-token"},
    )
    assert r.status_code == 200
    r = client.get("/api/drafts", headers={"Authorization": "Bearer test-token"})
    assert r.status_code == 200
