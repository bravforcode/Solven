"""Billing: plan->quota mapping + quota-check dependency (Phase 1)."""

from datetime import datetime, timezone

from fastapi import HTTPException, Request

from app.config import Settings
from app.db import Store
from app.principal import principal_from

PLAN_QUOTAS = {"trial": 50, "pro": 1000}
DEFAULT_QUOTA = 50


def quota_for_plan(plan: str) -> int:
    return PLAN_QUOTAS.get(plan, DEFAULT_QUOTA)


def require_quota(store: Store, settings: Settings):
    """FastAPI dependency for POST /api/coordinator: atomic usage increment,
    402 when the org's period count exceeds its plan quota. No-op in dev/demo
    or when the principal has no tenant."""

    def dep(request: Request) -> None:
        principal = principal_from(request, settings)
        if settings.env != "production" or not principal["tenant"]:
            return
        period = datetime.now(timezone.utc).strftime("%Y-%m")
        quota = quota_for_plan(store.get_org_plan(principal["tenant"]))
        row = store.increment_usage(principal["tenant"], period, quota)
        if row["count"] > row["quota"]:
            raise HTTPException(status_code=402, detail="org quota exceeded for this period")

    return dep