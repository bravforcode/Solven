"""Tests: coordinator routing, human-in-the-loop draft flow, audit log (agent_runs)."""

import json

import pytest
from fastapi.testclient import TestClient

from app.db import Store
from app.main import app

client = TestClient(app)

# ensure tests use isolated in-memory DB by re-pointing module-level store
@pytest.fixture(autouse=True)
def fresh_store(monkeypatch):
    from app import main

    monkeypatch.setenv("SOLVEN_LLM", "mock")  # deterministic tests, no network
    s = Store(":memory:")
    monkeypatch.setattr(main, "store", s)
    yield s


def test_health():
    r = client.get("/health")
    assert r.status_code == 200
    assert r.json()["status"] == "ok"


def test_submit_grading_creates_pending_draft(fresh_store):
    r = client.post("/api/coordinator", json={"agent": "grading", "input": "คำตอบนักเรียน: 2+2=4"})
    assert r.status_code == 200
    d = r.json()
    assert d["agent"] == "grading"
    assert d["status"] == "pending"
    assert "คะแนน" in d["output"]
    assert d["id"]


def test_unknown_agent_rejected():
    # unknown agent fails Pydantic Literal validation at schema level → 422
    r = client.post("/api/coordinator", json={"agent": "nope", "input": "x"})
    assert r.status_code == 422


def test_empty_input_422():
    r = client.post("/api/coordinator", json={"agent": "grading", "input": ""})
    assert r.status_code == 422


@pytest.mark.parametrize("agent", ["grading", "lesson-plan", "reporting"])
def test_all_agents_route(fresh_store, agent):
    r = client.post("/api/coordinator", json={"agent": agent, "input": "ทดสอบ"})
    assert r.status_code == 200
    assert r.json()["status"] == "pending"


def test_human_in_the_loop_approval_flow(fresh_store):
    d = client.post("/api/coordinator", json={"agent": "reporting", "input": "เด็กดีมาก"}).json()
    # before approval: pending
    assert d["status"] == "pending"
    # teacher approves
    r = client.patch(f"/api/drafts/{d['id']}", json={"status": "approved"})
    assert r.status_code == 200
    assert r.json()["status"] == "approved"
    # reject works too
    d2 = client.post("/api/coordinator", json={"agent": "grading", "input": "x"}).json()
    r2 = client.patch(f"/api/drafts/{d2['id']}", json={"status": "rejected"})
    assert r2.json()["status"] == "rejected"


def test_patch_unknown_draft_404(fresh_store):
    r = client.patch("/api/drafts/nope", json={"status": "approved"})
    assert r.status_code == 404


def test_audit_log_records_every_run(fresh_store):
    client.post("/api/coordinator", json={"agent": "grading", "input": "คำตอบ 1"})
    client.post("/api/coordinator", json={"agent": "lesson-plan", "input": "เศษส่วน ม.1"})
    runs = client.get("/api/audit").json()
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


def test_draft_warnings_stored(fresh_store):
    d = client.post("/api/coordinator", json={"agent": "grading", "input": "คำตอบ"}).json()
    assert isinstance(d["warnings"], list)
    assert d["warnings"] == json.loads(fresh_store.get_draft(d["id"])["warnings"])
