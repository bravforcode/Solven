import { NextRequest, NextResponse } from "next/server";
import { requirePrincipal } from "@/lib/bffAuth";

// BFF proxy to the backend demo-seed endpoint (dev/demo only — the backend
// hard-404s it in production). Demo data is deterministic and clearly
// synthetic (PDPA).
const API_URL =
  process.env.SOLVEN_BACKEND_URL ??
  process.env.NEXT_PUBLIC_SOLVEN_API_URL ??
  "http://localhost:8000";

const API_TOKEN = process.env.SOLVEN_API_TOKEN ?? "";

export async function POST(req: NextRequest) {
  const guard = await requirePrincipal();
  if (!guard.ok) return guard.response;

  try {
    const res = await fetch(`${API_URL}/api/demo/seed`, {
      method: "POST",
      headers: {
        ...(API_TOKEN ? { Authorization: `Bearer ${API_TOKEN}` } : {}),
        "x-solven-principal": guard.principal.teacherId,
        ...(guard.principal.tenant
          ? { "x-solven-tenant": guard.principal.tenant }
          : {}),
        ...(guard.principal.role
          ? { "x-solven-role": guard.principal.role }
          : {}),
        ...(guard.principal.orgName
          ? { "x-solven-org-name": guard.principal.orgName }
          : {}),
      },
      signal: AbortSignal.timeout(30000),
    });
    if (!res.ok) {
      return NextResponse.json(
        { error: `backend ${res.status}` },
        { status: res.status }
      );
    }
    const body = (await res.json()) as { seeded?: number };
    return NextResponse.json({ seeded: body.seeded ?? 0 });
  } catch {
    return NextResponse.json({ error: "backend unavailable" }, { status: 502 });
  }
}
