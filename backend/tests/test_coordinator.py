"""Tests: coordinator routing, human-in-the-loop draft flow, audit log (agent_runs).

Uses the app factory with an isolated in-memory store + fixed token.
"""

import json

import pytest
from fastapi.testclient import TestClient

from app.config import Settings
from app.db import Store
from app.main import create_app

TOKEN = "test-token"


@pytest.fixture()
def client():
    """Fresh app (in-memory DB, mock LLM) per test."""
    import os

    os.environ["SOLVEN_LLM"] = "mock"
    app = create_app(Settings(api_token=TOKEN, db_path=":memory:"))
    return TestClient(app)


def auth() -> dict:
    return {"Authorization": f"Bearer {TOKEN}"}


def test_health(client):
    r = client.get("/health")
    assert r.status_code == 200
    assert r.json()["status"] == "ok"


def test_fail_closed_raises_instead_of_mock_fallback(monkeypatch):
    """Production (fail_closed=True) must never degrade to mock output on provider error."""
    import httpx

    from app.coordinator import FailClosedError, run_task

    store = Store(":memory:")

    def boom(*args, **kwargs):
        raise httpx.HTTPStatusError("401 Unauthorized", request=httpx.Request("POST", "https://x"), response=httpx.Response(401))

    monkeypatch.setattr("app.coordinator.run_sub_agent", boom)
    with pytest.raises(FailClosedError):
        run_task(store, "grading", "input", fail_closed=True)


def test_production_app_returns_502_on_provider_failure(monkeypatch):
    """API level: production app must surface provider failure as 502, never mock 200."""
    import httpx

    monkeypatch.setenv("ANTHROPIC_API_KEY", "test-key")
    app = create_app(
        Settings(
            api_token="x" * 40,
            db_path=":memory:",
            env="production",
            llm="anthropic",
            cors_origins=["https://app.example.com"],
        )
    )
    client = TestClient(app)

    def boom(*args, **kwargs):
        raise httpx.HTTPStatusError(
            "401 Unauthorized",
            request=httpx.Request("POST", "https://x"),
            response=httpx.Response(401),
        )

    monkeypatch.setattr("app.coordinator.run_sub_agent", boom)
    r = client.post(
        "/api/coordinator",
        json={"agent": "grading", "input": "input"},
        headers={"Authorization": f"Bearer {'x' * 40}"},
    )
    assert r.status_code == 502, r.text


def test_dev_still_falls_back_to_mock_on_provider_error(monkeypatch):
    """Dev (fail_closed=False) keeps the honest fallback-mock path."""
    import httpx

    from app.coordinator import run_task

    store = Store(":memory:")
    calls = {"n": 0}

    def boom(*args, **kwargs):
        # fail only the real-provider attempt; the MockLLM fallback succeeds
        calls["n"] += 1
        if calls["n"] == 1:
            raise httpx.HTTPStatusError(
                "401 Unauthorized",
                request=httpx.Request("POST", "https://x"),
                response=httpx.Response(401),
            )
        return "mock fallback output"

    monkeypatch.setattr("app.coordinator.run_sub_agent", boom)
    draft = run_task(store, "grading", "input", fail_closed=False)
    assert draft["status"] == "pending"
    runs = store.list_runs()
    assert runs and runs[-1]["status"] == "fallback-mock"


def test_submit_grading_creates_pending_draft(client):
    r = client.post(
        "/api/coordinator",
        json={"agent": "grading", "input": "คำตอบนักเรียน: 2+2=4"},
        headers=auth(),
    )
    assert r.status_code == 200
    d = r.json()
    assert d["agent"] == "grading"
    assert d["status"] == "pending"
    assert "คะแนน" in d["output"]
    assert d["id"]


def test_unknown_agent_rejected(client):
    # unknown agent fails Pydantic Literal validation at schema level → 422
    r = client.post("/api/coordinator", json={"agent": "nope", "input": "x"}, headers=auth())
    assert r.status_code == 422


def test_empty_input_422(client):
    r = client.post("/api/coordinator", json={"agent": "grading", "input": ""}, headers=auth())
    assert r.status_code == 422


def test_oversized_input_422(client):
    r = client.post(
        "/api/coordinator",
        json={"agent": "grading", "input": "x" * 50_001},
        headers=auth(),
    )
    assert r.status_code == 422


@pytest.mark.parametrize("agent", ["grading", "lesson-plan", "reporting"])
def test_all_agents_route(client, agent):
    r = client.post("/api/coordinator", json={"agent": agent, "input": "ทดสอบ"}, headers=auth())
    assert r.status_code == 200
    assert r.json()["status"] == "pending"


def test_human_in_the_loop_approval_flow(client):
    d = client.post(
        "/api/coordinator", json={"agent": "reporting", "input": "เด็กดีมาก"}, headers=auth()
    ).json()
    # before approval: pending
    assert d["status"] == "pending"
    # teacher approves
    r = client.patch(f"/api/drafts/{d['id']}", json={"status": "approved"}, headers=auth())
    assert r.status_code == 200
    assert r.json()["status"] == "approved"
    # reject works too
    d2 = client.post(
        "/api/coordinator", json={"agent": "grading", "input": "x"}, headers=auth()
    ).json()
    r2 = client.patch(f"/api/drafts/{d2['id']}", json={"status": "rejected"}, headers=auth())
    assert r2.json()["status"] == "rejected"


def test_patch_unknown_draft_404(client):
    r = client.patch("/api/drafts/nope", json={"status": "approved"}, headers=auth())
    assert r.status_code == 404


def test_audit_log_records_every_run(client):
    client.post("/api/coordinator", json={"agent": "grading", "input": "คำตอบ 1"}, headers=auth())
    client.post(
        "/api/coordinator", json={"agent": "lesson-plan", "input": "เศษส่วน ม.1"}, headers=auth()
    )
    runs = client.get("/api/audit", headers=auth()).json()
    assert len(runs) >= 2
    assert all(r["agent"] in {"grading", "lesson-plan"} for r in runs)
    # audit fields per Appendix A.7
    for field in ("task_id", "agent", "model", "prompt_hash", "output_hash",
                  "status", "latency_ms", "guardrail_passed", "created_at"):
        assert field in runs[0], f"missing audit field: {field}"


def test_guardrail_flags_pii_in_output():
    from app.guardrail import check

    passed, warnings = check("เรียนผู้ปกครอง เบอร์ติดต่อ 0812345678 ขอรายงาน", "เด็กดี")
    assert passed is False
    assert any("เบอร์โทร" in w for w in warnings)


def test_draft_warnings_stored(client):
    d = client.post(
        "/api/coordinator", json={"agent": "grading", "input": "คำตอบ"}, headers=auth()
    ).json()
    store: Store = client.app.state.store
    assert isinstance(d["warnings"], list)
    assert d["warnings"] == json.loads(store.get_draft(d["id"])["warnings"])
