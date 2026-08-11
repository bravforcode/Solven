"""FastAPI app — Solven backend."""

import json
from typing import Optional

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from app.coordinator import run_task
from app.db import DB_PATH, Store
from app.schema import DraftOut, PatchDraft, TaskRequest

store = Store()

app = FastAPI(title="Solven Backend", version="0.1.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # dev only; tighten before production
    allow_methods=["*"],
    allow_headers=["*"],
)

VALID_AGENTS = {"grading", "lesson-plan", "reporting"}


def _to_out(d: dict) -> DraftOut:
    return DraftOut(
        id=d["id"],
        agent=d["agent"],
        input=d["input"],
        output=d["output"],
        status=d["status"],
        warnings=json.loads(d.get("warnings") or "[]"),
        createdAt=d["created_at"],
    )


@app.get("/health")
def health():
    return {"status": "ok", "db": str(DB_PATH)}


@app.post("/api/coordinator")
def submit_task(body: TaskRequest) -> DraftOut:
    if body.agent not in VALID_AGENTS:
        raise HTTPException(400, "unknown agent")
    draft = run_task(store, body.agent, body.input, body.rubric)
    return _to_out(draft)


@app.get("/api/drafts")
def list_drafts() -> list[DraftOut]:
    return [_to_out(d) for d in store.list_drafts()]


@app.patch("/api/drafts/{draft_id}")
def patch_draft(draft_id: str, body: PatchDraft) -> DraftOut:
    if body.status not in ("approved", "rejected"):
        raise HTTPException(400, "invalid status")
    row = store.set_draft_status(draft_id, body.status)
    if not row:
        raise HTTPException(404, "not found")
    return _to_out(row)


@app.get("/api/audit")
def audit(task_id: Optional[str] = None) -> list[dict]:
    """agent_runs audit trail (Appendix A.7)."""
    return store.list_runs(task_id)
