"""Org membership provisioning (Phase 1: lazy sync from BFF-trusted headers)."""

from fastapi import HTTPException, Request

from app.config import Settings
from app.db import Store
from app.principal import principal_from


def ensure_org_membership(store: Store, settings: Settings):
    """FastAPI dependency: upsert org + membership rows for the request principal.

    Runs before quota checks so orgs always exist when usage is counted.
    No-op in dev/demo or when the principal has no tenant.
    """

    def dep(request: Request) -> None:
        principal = principal_from(request, settings)
        if settings.env != "production" or not principal["tenant"]:
            return
        store.ensure_org(
            principal["tenant"],
            name=principal.get("org_name") or principal["tenant"],
        )
        store.ensure_member(
            principal["teacher_id"],
            principal["tenant"],
            role=principal.get("role") or "teacher",
        )

    return dep