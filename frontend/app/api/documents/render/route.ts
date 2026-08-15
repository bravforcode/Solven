import { NextRequest, NextResponse } from "next/server";
import { requirePrincipal } from "@/lib/bffAuth";

const API_URL =
  process.env.SOLVEN_BACKEND_URL ??
  process.env.NEXT_PUBLIC_SOLVEN_API_URL ??
  "http://localhost:8000";
const API_TOKEN = process.env.SOLVEN_API_TOKEN ?? "";

const VALID_KINDS = ["worksheet", "lesson-record", "official-letter", "certificate", "summary"];

export async function POST(req: NextRequest) {
  const guard = await requirePrincipal();
  if (!guard.ok) return guard.response;

  // REVIEW F2: cap payload before parsing (memory/DoS guard)
  const contentLength = Number(req.headers.get("content-length") ?? 0);
  if (contentLength > 1_000_000) {
    return NextResponse.json({ error: "payload too large" }, { status: 413 });
  }

  const body = await req.json();
  const { kind, fields, school } = body as {
    kind?: string;
    fields?: Record<string, unknown>;
    school?: Record<string, unknown>;
  };

  if (!kind || !VALID_KINDS.includes(kind)) {
    return NextResponse.json({ error: "unknown kind" }, { status: 400 });
  }
  if (!fields || typeof fields !== "object") {
    return NextResponse.json({ error: "fields required" }, { status: 400 });
  }

  try {
    const res = await fetch(`${API_URL}/api/documents/render`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(API_TOKEN ? { Authorization: `Bearer ${API_TOKEN}` } : {}),
        "x-solven-principal": guard.principal.teacherId,
        ...(guard.principal.tenant
          ? { "x-solven-tenant": guard.principal.tenant }
          : {}),
      },
      signal: AbortSignal.timeout(30000),
      // REVIEW FIX 1: forward school verbatim — the backend needs it for the
      // document header; dropping it here empties every server PDF
      body: JSON.stringify({ kind, fields, school: school ?? {} }),
    });
    if (!res.ok) {
      let detail = `backend ${res.status}`;
      try {
        const body = (await res.json()) as { detail?: string };
        if (body.detail) detail = body.detail;
      } catch {
        /* non-JSON error body — keep status */
      }
      // REVIEW F4: preserve backend 4xx (validation/auth); 5xx → 502
      const status = res.status < 500 ? res.status : 502;
      return NextResponse.json({ error: detail }, { status });
    }
    const pdf = await res.arrayBuffer();
    return new NextResponse(pdf, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": 'attachment; filename="solven-document.pdf"',
      },
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 502 }
    );
  }
}
