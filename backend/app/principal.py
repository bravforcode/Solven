"""Principal extraction from trusted edge-injected headers (Phase 1).

Moved out of main.py so org/billing dependencies can share it.
"""

from typing import Optional, TypedDict

from fastapi import HTTPException, Request

from app.config import Settings


class Principal(TypedDict):
    teacher_id: str
    tenant: Optional[str]
    role: Optional[str]
    org_name: Optional[str]


def principal_from(request: Request, settings: Settings) -> Principal:
    """Extract the verified principal from trusted edge-injected headers.

    ASSUMPTION (documented, see docs/audits/2026-08-13/02_implementation_plan.md):
    in production the app sits behind an identity-aware edge (OIDC/session proxy)
    that sets `x-solven-principal` (and optionally `x-solven-tenant`,
    `x-solven-role`, `x-solven-org-name`). These headers MUST be stripped/
    re-asserted by the edge — the BFF/backend never trusts client-supplied
    values. In dev/demo mode the principal is a fixed demo identity so local
    development still works.
    """
    if settings.env != "production":
        return {"teacher_id": "demo-teacher", "tenant": None, "role": None, "org_name": None}
    teacher_id = request.headers.get("x-solven-principal")
    if not teacher_id or not teacher_id.strip():
        raise HTTPException(status_code=401, detail="missing verified principal (x-solven-principal)")
    tenant = request.headers.get("x-solven-tenant")
    role = request.headers.get("x-solven-role")
    org_name = request.headers.get("x-solven-org-name")
    return {
        "teacher_id": teacher_id.strip(),
        "tenant": (tenant.strip() or None) if tenant else None,
        "role": (role.strip() or None) if role else None,
        "org_name": (org_name.strip() or None) if org_name else None,
    }