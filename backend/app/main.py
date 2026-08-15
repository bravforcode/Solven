"""FastAPI app factory — Solven backend (enterprise-grade configuration).

Run:  uvicorn app.main:app   (module-level `app` = default settings)
"""

import json
import logging
import os
from typing import Optional

from fastapi import Depends, FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware

from app.billing import require_quota
from app.config import Settings
from app.coordinator import FailClosedError, InFlightError, TaskNotOwnedError, run_task
from app.db import DB_URL_DEFAULT, Store, now_iso
from app.orgs import ensure_org_membership
from app.principal import principal_from
from app.seed import seed_demo
from app.middleware import (
    RateLimitMiddleware,
    RequestContextMiddleware,
    SecurityHeadersMiddleware,
)
from app.migrate import apply_migrations
from app.schema import BillingWebhookEvent, DraftOut, PatchDraft, RunRecord, TaskRequest
from app.security import auth_dependency

class JsonFormatter(logging.Formatter):
    """One JSON object per line (T2-09 / AUD-M-12): request context fields are
    included when the middleware passes them via logging `extra`."""

    _CONTEXT_KEYS = ("request_id", "method", "path", "status", "duration_ms")

    def format(self, record: logging.LogRecord) -> str:
        payload: dict = {
            "ts": self.formatTime(record, "%Y-%m-%dT%H:%M:%S%z"),
            "level": record.levelname,
            "logger": record.name,
            "msg": record.getMessage(),
        }
        for key in self._CONTEXT_KEYS:
            value = getattr(record, key, None)
            if value is not None:
                payload[key] = value
        if record.exc_info:
            payload["exc"] = self.formatException(record.exc_info)
        return json.dumps(payload, ensure_ascii=False)


# structured JSON logging on root — configured explicitly (no handlers[0]
# assumption) so the app works regardless of how logging was preconfigured.
_root = logging.getLogger()
_root.setLevel(logging.INFO)
if not _root.handlers:
    _handler = logging.StreamHandler()
    _handler.setFormatter(JsonFormatter())
    _root.addHandler(_handler)

VALID_AGENTS = {"grading", "lesson-plan", "reporting"}


def create_app(settings: Optional[Settings] = None) -> FastAPI:
    settings = settings or Settings()
    # Keep the LLM-mode config and the runtime provider selection in sync:
    # app/llm.py reads SOLVEN_LLM from the environment directly.
    os.environ.setdefault("SOLVEN_LLM", settings.llm)
    database_url = settings.database_url or DB_URL_DEFAULT
    store = Store(database_url)
    with store._c() as conn:
        apply_migrations(conn)

    # PDPA lifecycle (T1-09): purge expired drafts on startup
    try:
        purged = store.purge_expired(settings.retention_days)
        if purged:
            logging.getLogger("solven").info(
                "purged %s expired drafts (retention %sd)", purged, settings.retention_days
            )
    except Exception:  # noqa: BLE001 - startup must not crash on a purge failure
        logging.getLogger("solven").warning("retention purge failed at startup", exc_info=True)

    # SEC-L-02: interactive API docs + OpenAPI are dev affordances — hide them
    # in production so the schema/route map is not public.
    app = FastAPI(
        title=settings.app_name,
        version=settings.version,
        docs_url=None if settings.env == "production" else "/docs",
        redoc_url=None if settings.env == "production" else "/redoc",
        openapi_url=None if settings.env == "production" else "/openapi.json",
    )
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
            teacherId=d.get("teacher_id"),
            reviewedBy=d.get("reviewed_by"),
        )

    @app.get("/health", tags=["ops"])
    def health():
        return {"status": "ok", "version": settings.version}

    @app.get("/readyz", tags=["ops"])
    def readyz():
        """Readiness: prove the persisted DB actually works (AUD-H-12 / DEV-06).

        /health is liveness-only; /readyz is what load balancers and Compose
        should probe so a broken persistence path is never served as healthy.
        """
        try:
            with store._c() as conn:
                conn.execute("SELECT COUNT(*) FROM schema_migrations").fetchone()
        except Exception as exc:  # noqa: BLE001 - readiness must never 500
            raise HTTPException(503, f"db not ready: {type(exc).__name__}") from exc
        return {"status": "ready", "version": settings.version}

    @app.post("/api/coordinator", dependencies=[require_token, Depends(ensure_org_membership(store, settings)), Depends(require_quota(store, settings))], tags=["api"])
    def submit_task(body: TaskRequest, request: Request) -> DraftOut:
        if body.agent not in VALID_AGENTS:
            raise HTTPException(400, "unknown agent")
        principal = principal_from(request, settings)
        try:
            draft = run_task(
                store,
                body.agent,
                body.input,
                body.rubric,
                body.client_task_id,
                fail_closed=settings.env == "production",
                teacher_id=principal["teacher_id"],
                org_id=principal["tenant"],
            )
        except FailClosedError as exc:
            raise HTTPException(502, str(exc)) from exc
        except TaskNotOwnedError as exc:
            raise HTTPException(403, str(exc)) from exc
        except InFlightError as exc:
            raise HTTPException(409, str(exc)) from exc
        return _to_out(draft)

    @app.get("/api/drafts", dependencies=[require_token], tags=["api"])
    def list_drafts(request: Request, limit: int = 100, offset: int = 0) -> list[DraftOut]:
        principal = principal_from(request, settings)
        # production: drafts are scoped to the authenticated teacher + org
        teacher_id = principal["teacher_id"] if settings.env == "production" else None
        org_id = principal["tenant"] if settings.env == "production" else None
        limit = max(1, min(limit, 500))  # bounded page size (AUD-M-02)
        offset = max(0, offset)
        return [_to_out(d) for d in store.list_drafts(teacher_id=teacher_id, org_id=org_id, limit=limit, offset=offset)]

    @app.patch("/api/drafts/{draft_id}", dependencies=[require_token], tags=["api"])
    def patch_draft(draft_id: str, body: PatchDraft, request: Request) -> DraftOut:
        if body.status not in ("approved", "rejected"):
            raise HTTPException(400, "invalid status")
        principal = principal_from(request, settings)
        row = store.get_draft(draft_id)
        if not row:
            raise HTTPException(404, "not found")
        # ownership check: a teacher can only review their own org's drafts
        if settings.env == "production" and (
            row.get("teacher_id") != principal["teacher_id"]
            or row.get("org_id") != principal["tenant"]
        ):
            raise HTTPException(403, "not your draft")
        updated = store.set_draft_status(draft_id, body.status)
        if not updated:
            raise HTTPException(404, "not found")
        return _to_out(updated)

    @app.delete("/api/drafts/{draft_id}", dependencies=[require_token], tags=["api"])
    def delete_draft(draft_id: str, request: Request) -> dict:
        """Scoped deletion (PDPA data-rights / AUD-H-09). Owner-only in production."""
        principal = principal_from(request, settings)
        row = store.get_draft(draft_id)
        if not row:
            raise HTTPException(404, "not found")
        if settings.env == "production" and (
            row.get("teacher_id") != principal["teacher_id"]
            or row.get("org_id") != principal["tenant"]
        ):
            raise HTTPException(403, "not your draft")
        store.delete_draft(draft_id)
        return {"deleted": draft_id}

    @app.post("/api/demo/seed", dependencies=[require_token], tags=["demo"])
    def demo_seed(request: Request) -> dict:
        """Populate the deterministic demo dataset (dev/demo only).

        Hard 404 in production: the demo endpoint must not exist on a real
        deployment (same security stance as mock LLM — fail closed).
        """
        if settings.env == "production":
            raise HTTPException(404, "not found")
        principal = principal_from(request, settings)
        seeded = seed_demo(store, principal["teacher_id"])
        return {"seeded": seeded}

    @app.get("/api/audit", dependencies=[require_token], tags=["api"])
    def audit(task_id: Optional[str] = None, request: Request = None,
              limit: int = 100, offset: int = 0) -> list[RunRecord]:
        """agent_runs audit trail (Appendix A.7) — tenant-scoped in production."""
        limit = max(1, min(limit, 500))
        offset = max(0, offset)
        if settings.env == "production":
            principal = principal_from(request, settings)
            runs = store.list_runs_for_teacher(
                principal["teacher_id"], org_id=principal["tenant"], limit=limit, offset=offset
            )
        else:
            runs = store.list_runs(task_id, limit=limit, offset=offset)
        return [RunRecord(**r) for r in runs]

    @app.post("/api/internal/billing/webhook", dependencies=[require_token], tags=["internal"])
    def billing_webhook(body: BillingWebhookEvent) -> dict:
        """Idempotent subscription sync — called by the BFF after Stripe signature
        verification. Dedup by Stripe event id."""
        if not store.record_stripe_event(body.event_id):
            return {"received": True, "duplicate": True}
        data = body.data
        org_id = data.get("org_id")
        if not org_id:
            return {"received": True, "skipped": "no org_id"}
        if body.type in ("customer.subscription.created", "customer.subscription.updated"):
            store.upsert_subscription(
                org_id,
                data["stripe_sub_id"],
                data.get("status", "active"),
                data.get("period_end") or now_iso(),
            )
            if data.get("plan"):
                store.set_org_plan(org_id, data["plan"])
            if data.get("customer_id"):
                store.set_org_stripe_customer(org_id, data["customer_id"])
        elif body.type == "customer.subscription.deleted":
            store.upsert_subscription(org_id, data["stripe_sub_id"], "canceled", data.get("period_end") or now_iso())
        return {"received": True}

    @app.get("/api/internal/billing/customer", dependencies=[require_token], tags=["internal"])
    def billing_customer(org_id: str) -> dict:
        customer_id = store.get_org_stripe_customer(org_id)
        if not customer_id:
            raise HTTPException(404, "no stripe customer for org")
        return {"customer_id": customer_id}

    return app


app = create_app()
