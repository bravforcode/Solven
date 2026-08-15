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
from app.demo_features import (
    attendance_summary,
    audit_summary,
    early_warning,
    generate_exam,
    line_preview,
    llm_judge,
    moe_report,
    notifications,
    question_bank,
    rag_search,
    roster_default,
)
from app.orgs import ensure_org_membership
from app.principal import principal_from
from app.seed import seed_demo
from app.middleware import (
    RateLimitMiddleware,
    RequestContextMiddleware,
    SecurityHeadersMiddleware,
)
from app.migrate import apply_migrations
from app.schema import (
    BillingWebhookEvent,
    DocumentRenderRequest,
    DraftOut,
    PatchDraft,
    RunRecord,
    TaskRequest,
)
from app.security import auth_dependency
from app.documents import render_document

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

    # NOTE: dependency order matters — ensure_org_membership MUST run before
    # require_quota (usage_counters.org_id has an FK to orgs(id); a quota
    # increment for a not-yet-provisioned org would 500). Quota counts
    # ATTEMPTS, not completions: it is charged before agent validation and
    # before the run outcome is known (anti-flood design).
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
        row = store.get_draft(draft_id, org_id=principal["tenant"])
        if not row:
            raise HTTPException(404, "not found")
        # ownership check: a teacher can only review their own org's drafts
        if settings.env == "production" and (
            row.get("teacher_id") != principal["teacher_id"]
            or row.get("org_id") != principal["tenant"]
        ):
            raise HTTPException(403, "not your draft")
        updated = store.set_draft_status(draft_id, body.status, org_id=principal["tenant"])
        if not updated:
            raise HTTPException(404, "not found")
        return _to_out(updated)

    @app.delete("/api/drafts/{draft_id}", dependencies=[require_token], tags=["api"])
    def delete_draft(draft_id: str, request: Request) -> dict:
        """Scoped deletion (PDPA data-rights / AUD-H-09). Owner-only in production."""
        principal = principal_from(request, settings)
        row = store.get_draft(draft_id, org_id=principal["tenant"])
        if not row:
            raise HTTPException(404, "not found")
        if settings.env == "production" and (
            row.get("teacher_id") != principal["teacher_id"]
            or row.get("org_id") != principal["tenant"]
        ):
            raise HTTPException(403, "not your draft")
        store.delete_draft(draft_id, org_id=principal["tenant"])
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

    # ------------------------------------------------------------------
    # Demo feature endpoints (dev/demo only — hard 404 in production).
    # All generators are deterministic mocks (see app/demo_features.py).
    # ------------------------------------------------------------------

    def _demo_only():
        if settings.env == "production":
            raise HTTPException(404, "not found")

    @app.get("/api/demo/roster", dependencies=[require_token], tags=["demo"])
    def demo_roster() -> list[dict]:
        """Mock class roster (feature 8)."""
        _demo_only()
        return roster_default()

    @app.get("/api/demo/questions", dependencies=[require_token], tags=["demo"])
    def demo_questions(subject: str | None = None, grade: str | None = None) -> list[dict]:
        """Mock question bank (feature 9)."""
        _demo_only()
        return question_bank(subject, grade)

    @app.post("/api/demo/exams/generate", dependencies=[require_token], tags=["demo"])
    def demo_exam_generate(body: dict) -> dict:
        """Mock exam generator (feature 9)."""
        _demo_only()
        subject = str(body.get("subject") or "คณิตศาสตร์")
        grade = str(body.get("grade") or "ป.5")
        count = int(body.get("count") or 5)
        return generate_exam(subject, grade, count)

    @app.get("/api/demo/rag", dependencies=[require_token], tags=["demo"])
    def demo_rag(q: str, limit: int = 3) -> list[dict]:
        """Mock RAG knowledge-base search (feature 12)."""
        _demo_only()
        return rag_search(q, limit)

    @app.post("/api/demo/judge", dependencies=[require_token], tags=["demo"])
    def demo_judge(body: dict) -> dict:
        """Mock LLM-judge quality scoring (feature 13)."""
        _demo_only()
        return llm_judge(str(body.get("output") or ""), body.get("rubric"))

    @app.get("/api/demo/early-warning", dependencies=[require_token], tags=["demo"])
    def demo_early_warning() -> list[dict]:
        """Mock early-warning flags (feature 14)."""
        _demo_only()
        return early_warning()

    @app.get("/api/demo/moe-report", dependencies=[require_token], tags=["demo"])
    def demo_moe_report(period: str = "ภาคเรียนที่ 1/2569") -> dict:
        """Mock MOE Exchange report (feature 11)."""
        _demo_only()
        return moe_report(period)

    @app.get("/api/demo/attendance", dependencies=[require_token], tags=["demo"])
    def demo_attendance(period: str = "สัปดาห์นี้") -> dict:
        """Mock attendance summary (feature 21)."""
        _demo_only()
        return attendance_summary(period)

    @app.get("/api/demo/audit-summary", dependencies=[require_token], tags=["demo"])
    def demo_audit_summary() -> dict:
        """Mock audit dashboard summary (feature 32)."""
        _demo_only()
        return audit_summary()

    @app.post("/api/demo/line-preview", dependencies=[require_token], tags=["demo"])
    def demo_line_preview(body: dict) -> dict:
        """Mock LINE OA message preview (feature 3)."""
        _demo_only()
        return line_preview(str(body.get("text") or ""), str(body.get("recipient") or "ผู้ปกครอง"))

    @app.get("/api/demo/notifications", dependencies=[require_token], tags=["demo"])
    def demo_notifications() -> list[dict]:
        """Mock notification feed (feature 3)."""
        _demo_only()
        return notifications()

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

    @app.post("/api/documents/render", dependencies=[require_token], tags=["api"])
    def render_doc(body: DocumentRenderRequest):
        from fastapi.responses import Response

        # REVIEW F2: soft cap — Starlette parses the body before this check;
        # the BFF enforces a pre-parse content-length guard for the browser
        # path. Direct backend callers are token-gated + rate-limited.
        if len(body.model_dump_json()) > 200_000:
            raise HTTPException(413, "payload too large")
        try:
            pdf = render_document(body.kind, body.fields, body.school)
        except ValueError as exc:
            raise HTTPException(400, str(exc)) from exc
        except RuntimeError as exc:
            raise HTTPException(503, str(exc)) from exc
        except Exception as exc:  # noqa: BLE001 - PDF failure is a 500 with reason
            raise HTTPException(500, f"pdf render failed: {exc}") from exc
        return Response(
            content=pdf,
            media_type="application/pdf",
            headers={"Content-Disposition": 'attachment; filename="solven-document.pdf"'},
        )

    @app.post("/api/internal/billing/webhook", dependencies=[require_token], tags=["internal"])
    def billing_webhook(body: BillingWebhookEvent) -> dict:
        """Idempotent subscription sync — called by the BFF after Stripe signature
        verification. Dedup by Stripe event id.

        Validation happens BEFORE record_stripe_event: a malformed payload must
        not burn the event id (Stripe retries the same id for ~3 days — burning
        it early would permanently drop the event).
        """
        data = body.data
        if body.type in (
            "customer.subscription.created",
            "customer.subscription.updated",
            "customer.subscription.deleted",
        ) and not data.get("stripe_sub_id"):
            raise HTTPException(400, "missing stripe_sub_id")
        if not store.record_stripe_event(body.event_id):
            return {"received": True, "duplicate": True}
        org_id = data.get("org_id")
        if not org_id:
            return {"received": True, "skipped": "no org_id"}
        # Lazy-provision the org row: Stripe events can arrive before the
        # teacher's first coordinator call (checkout → webhook ordering),
        # and upsert_subscription has an FK on orgs(id).
        store.ensure_org(org_id, data.get("org_name") or org_id)
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
