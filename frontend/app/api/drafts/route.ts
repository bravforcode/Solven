import { NextRequest, NextResponse } from "next/server";
import { isDemoMode, requirePrincipal } from "@/lib/bffAuth";
import { listDrafts } from "@/lib/store";

export async function GET(req: NextRequest) {
  // AUD-C-03 / SEC-C-01: deny by default; production scopes drafts to the
  // authenticated teacher (AUD-H-01). Untagged drafts are never visible to
  // real principals — only the demo identity sees them.
  const guard = requirePrincipal(req);
  if (!guard.ok) return guard.response;

  const drafts = listDrafts();
  const visible = isDemoMode()
    ? drafts
    : drafts.filter((d) => d.teacherId === guard.principal.teacherId);
  return NextResponse.json(visible);
}
