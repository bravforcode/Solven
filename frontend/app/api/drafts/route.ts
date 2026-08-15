import { NextRequest, NextResponse } from "next/server";
import { listBackendDrafts } from "@/lib/backend";
import { isDemoMode, requirePrincipal } from "@/lib/bffAuth";
import { listDrafts } from "@/lib/store";

export async function GET(req: NextRequest) {
  // AUD-C-03 / SEC-C-01: deny by default; production scopes drafts to the
  // authenticated teacher (AUD-H-01). Untagged drafts are never visible to
  // real principals — only the demo identity sees them.
  const guard = await requirePrincipal();
  if (!guard.ok) return guard.response;

  // T1-03 / AUD-H-06: the backend is the authoritative store. Merge backend
  // rows (scoped by principal) with local drafts; backend wins on id conflicts.
  let backendDrafts: Awaited<ReturnType<typeof listBackendDrafts>> = [];
  let backendOk = false;
  try {
    backendDrafts = await listBackendDrafts(guard.principal);
    backendOk = true;
  } catch {
    backendOk = false; // demo mode tolerates backend absence
  }
  if (!backendOk && !isDemoMode()) {
    // production: backend is required — surface failure instead of serving
    // only the volatile local cache.
    return NextResponse.json({ error: "backend unavailable" }, { status: 502 });
  }

  const byId = new Map<string, (typeof backendDrafts)[number]>();
  for (const d of backendDrafts) byId.set(d.id, d);
  for (const d of listDrafts()) {
    if (!byId.has(d.id)) byId.set(d.id, d);
  }
  const visible = Array.from(byId.values());
  if (isDemoMode()) return NextResponse.json(visible);
  return NextResponse.json(visible.filter((d) => d.teacherId === guard.principal.teacherId));
}
