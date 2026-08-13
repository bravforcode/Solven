"""FastAPI app factory — Solven backend (enterprise-grade configuration).

Run:  uvicorn app.main:app   (module-level `app` = default settings)
"""

import json
import logging
import os
from pathlib import Path
from typing import Optional, TypedDict

from fastapi import Depends, FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware

from app.config import Settings
from app.coordinator import FailClosedError, TaskNotOwnedError, run_task
from app.db import DB_PATH, Store
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

    Preserves the ':memory:' magic string for tests; returns None when unset or
    blank (Store then falls back to its default file path). Whitespace-only
    values are treated as unset so a stray env value cannot create a file.
    """
    if not db_path or not db_path.strip():
        return None
    if db_path.strip() == ":memory:":
        return db_path.strip()  # type: ignore[return-value]  # magic string handled by Store
    return Path(db_path.strip())


class _Principal(TypedDict):
    teacher_id: str
    tenant: Optional[str]


def _principal(request: Request, settings: Settings) -> _Principal:
    """Extract the verified principal from trusted edge-injected headers.

    ASSUMPTION (documented, see docs/audits/2026-08-13/02_implementation_plan.md):
    in production the app sits behind an identity-aware edge (OIDC/session proxy)
    that sets `x-solven-principal` (and optionally `x-solven-tenant`). These
    headers MUST be stripped/re-asserted by the edge — the BFF/backend never
    trusts client-supplied values. In dev/demo mode the principal is a fixed
    demo identity so local development still works.
    """
    if settings.env != "production":
        return {"teacher_id": "demo-teacher", "tenant": None}
    teacher_id = request.headers.get("x-solven-principal")
    if not teacher_id or not teacher_id.strip():
        raise HTTPException(status_code=401, detail="missing verified principal (x-solven-principal)")
    tenant = request.headers.get("x-solven-tenant")
    return {"teacher_id": teacher_id.strip(), "tenant": (tenant.strip() if tenant else None)}


def create_app(settings: Optional[Settings] = None) -> FastAPI:
    settings = settings or Settings()
    # Keep the LLM-mode config and the runtime provider selection in sync:
    # app/llm.py reads SOLVEN_LLM from the environment directly.
    os.environ.setdefault("SOLVEN_LLM", settings.llm)
    db_path = _resolve_db_path(settings.db_path) or DB_PATH
    store = Store(db_path)

    # apply schema migrations on startup (file-backed DBs only)
    if db_path != ":memory:":
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
    def submit_task(body: TaskRequest, request: Request) -> DraftOut:
        if body.agent not in VALID_AGENTS:
            raise HTTPException(400, "unknown agent")
        principal = _principal(request, settings)
        try:
            draft = run_task(
                store,
                body.agent,
                body.input,
                body.rubric,
                body.client_task_id,
                fail_closed=settings.env == "production",
                teacher_id=principal["teacher_id"],
            )
        except FailClosedError as exc:
            raise HTTPException(502, str(exc)) from exc
        except TaskNotOwnedError as exc:
            raise HTTPException(403, str(exc)) from exc
        return _to_out(draft)

    @app.get("/api/drafts", dependencies=[require_token], tags=["api"])
    def list_drafts(request: Request) -> list[DraftOut]:
        principal = _principal(request, settings)
        # production: drafts are scoped to the authenticated teacher
        teacher_id = principal["teacher_id"] if settings.env == "production" else None
        return [_to_out(d) for d in store.list_drafts(teacher_id=teacher_id)]

    @app.patch("/api/drafts/{draft_id}", dependencies=[require_token], tags=["api"])
    def patch_draft(draft_id: str, body: PatchDraft, request: Request) -> DraftOut:
        if body.status not in ("approved", "rejected"):
            raise HTTPException(400, "invalid status")
        principal = _principal(request, settings)
        row = store.get_draft(draft_id)
        if not row:
            raise HTTPException(404, "not found")
        # ownership check: a teacher can only review their own drafts
        if settings.env == "production" and row.get("teacher_id") != principal["teacher_id"]:
            raise HTTPException(403, "not your draft")
        updated = store.set_draft_status(draft_id, body.status)
        if not updated:
            raise HTTPException(404, "not found")
        return _to_out(updated)

    @app.get("/api/audit", dependencies=[require_token], tags=["api"])
    def audit(task_id: Optional[str] = None, request: Request = None) -> list[RunRecord]:
        """agent_runs audit trail (Appendix A.7) — tenant-scoped in production."""
        if settings.env == "production":
            principal = _principal(request, settings)
            runs = store.list_runs_for_teacher(principal["teacher_id"])
        else:
            runs = store.list_runs(task_id)
        return [RunRecord(**r) for r in runs]

    return app


app = create_app()
