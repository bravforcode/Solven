import { NextRequest, NextResponse } from "next/server";

// BFF identity guard (AUD-C-03 / SEC-C-01 / ARCH-03).
//
// ASSUMPTION (documented in docs/audits/2026-08-13/02_implementation_plan.md):
// in production the app sits behind an identity-aware edge (OIDC/session proxy)
// that sets `x-solven-principal` (teacher id) and optionally `x-solven-tenant`.
// The edge MUST strip and re-assert these headers — the BFF never trusts
// client-supplied values. In demo mode a fixed identity is used so local
// development works without the edge.
const DEMO_MODE = process.env.NEXT_PUBLIC_SOLVEN_MODE === "demo";

export interface Principal {
  teacherId: string;
  tenant?: string;
}

export function requirePrincipal(req: NextRequest):
  | { ok: true; principal: Principal }
  | { ok: false; response: NextResponse } {
  if (DEMO_MODE) {
    return { ok: true, principal: { teacherId: "demo-teacher" } };
  }
  const teacherId = req.headers.get("x-solven-principal");
  if (!teacherId || !teacherId.trim()) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "missing verified principal" },
        { status: 401 }
      ),
    };
  }
  const tenant = req.headers.get("x-solven-tenant");
  return {
    ok: true,
    principal: {
      teacherId: teacherId.trim(),
      tenant: tenant?.trim() || undefined,
    },
  };
}
