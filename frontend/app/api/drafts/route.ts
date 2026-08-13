import { NextRequest, NextResponse } from "next/server";
import { requirePrincipal } from "@/lib/bffAuth";
import { listDrafts } from "@/lib/store";

export async function GET(req: NextRequest) {
  // AUD-C-03 / SEC-C-01: deny by default; production scopes drafts to the
  // authenticated teacher (AUD-H-01).
  const guard = requirePrincipal(req);
  if (!guard.ok) return guard.response;

  const drafts = listDrafts();
  const visible = guard.principal.teacherId === "demo-teacher"
    ? drafts
    : drafts.filter((d) => !d.teacherId || d.teacherId === guard.principal.teacherId);
  return NextResponse.json(visible);
}
