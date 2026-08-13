"""FastAPI app factory — Solven backend (enterprise-grade configuration).

Run:  uvicorn app.main:app   (module-level `app` = default settings)
"""

import json
import logging
from pathlib import Path
from typing import Optional

from fastapi import Depends, FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from app.config import Settings
from app.coordinator import run_task
from app.db import Store
from app.middleware import (
    RateLimitMiddleware,
    RequestContextMiddleware,
    SecurityHeadersMiddleware,
)
from app.migrate import apply_migrations
from app.schema import DraftOut, PatchDraft, RunRecord, TaskRequest
from app.security import auth_dependency

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s %(message)s")

VALID_AGENTS = {"grading", "lesson-plan", "reporting"}


def _resolve_db_path(db_path: str) -> Optional[Path]:
    """Normalize the configured DB path to one value used everywhere.

    Preserves the ':memory:' magic string for tests; returns None when unset
    (Store then falls back to its default file path).
    """
    if not db_path:
        return None
    if db_path == ":memory:":
        return db_path  # type: ignore[return-value]  # magic string handled by Store
    return Path(db_path)


def create_app(settings: Optional[Settings] = None) -> FastAPI:
    settings = settings or Settings()
    db_path = _resolve_db_path(settings.db_path)
    store = Store(db_path)

    # apply schema migrations on startup (file-backed DBs only)
    if db_path and db_path != ":memory:":
        import sqlite3

        db_path.parent.mkdir(parents=True, exist_ok=True)
        with sqlite3.connect(db_path, check_same_thread=False) as conn:
            apply_migrations(conn)

    app = FastAPI(title=settings.app_name, version=settings.version)
    app.state.settings = settings
    app.state.store = store

    app.add_middleware(SecurityHeadersMiddleware)
    app.add_middleware(RequestContextMiddleware)
    app.add_middleware(
        RateLimitMiddleware, limit_per_min=settings.rate_limit_per_min
    )
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    require_token = Depends(auth_dependency(settings))

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

    @app.get("/health", tags=["ops"])
    def health():
        return {"status": "ok", "version": settings.version}

    @app.post("/api/coordinator", dependencies=[require_token], tags=["api"])
    def submit_task(body: TaskRequest) -> DraftOut:
        if body.agent not in VALID_AGENTS:
            raise HTTPException(400, "unknown agent")
        draft = run_task(store, body.agent, body.input, body.rubric, body.client_task_id)
        return _to_out(draft)

    @app.get("/api/drafts", dependencies=[require_token], tags=["api"])
    def list_drafts() -> list[DraftOut]:
        return [_to_out(d) for d in store.list_drafts()]

    @app.patch("/api/drafts/{draft_id}", dependencies=[require_token], tags=["api"])
    def patch_draft(draft_id: str, body: PatchDraft) -> DraftOut:
        if body.status not in ("approved", "rejected"):
            raise HTTPException(400, "invalid status")
        row = store.set_draft_status(draft_id, body.status)
        if not row:
            raise HTTPException(404, "not found")
        return _to_out(row)

    @app.get("/api/audit", dependencies=[require_token], tags=["api"])
    def audit(task_id: Optional[str] = None) -> list[RunRecord]:
        """agent_runs audit trail (Appendix A.7)."""
        return [RunRecord(**r) for r in store.list_runs(task_id)]

    return app


app = create_app()
