import { NextRequest, NextResponse } from "next/server";
import { patchDraft } from "@/lib/backend";
import { isDemoMode, requirePrincipal } from "@/lib/bffAuth";
import { listDrafts, updateDraftStatus } from "@/lib/store";
import { DraftStatus } from "@/lib/types";

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  // AUD-C-03: deny by default — production requires a verified principal.
  const guard = requirePrincipal(req);
  if (!guard.ok) return guard.response;

  const { status } = (await req.json()) as { status: DraftStatus };

  // "pending" allowed for undo (toast action) — additive; approved/rejected unchanged.
  if (status !== "approved" && status !== "rejected" && status !== "pending") {
    return NextResponse.json({ error: "invalid status" }, { status: 400 });
  }

  const existing = listDrafts().find((d) => d.id === params.id);
  if (!existing) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }
  // AUD-H-01: ownership — a teacher can only review their own drafts.
  // Untagged drafts are reviewable by the demo identity only.
  if (!isDemoMode() && existing.teacherId !== guard.principal.teacherId) {
    return NextResponse.json({ error: "not your draft" }, { status: 403 });
  }

  // AUD-H-06: backend-authoritative — for backend drafts, the mirror must
  // succeed BEFORE the local status changes. Fail closed, no optimistic update.
  // "pending" (undo) is local-only: the backend PATCH accepts final states only.
  if (existing.engine === "backend" && (status === "approved" || status === "rejected")) {
    const ok = await patchDraft(existing.id, status, guard.principal);
    if (!ok) {
      return NextResponse.json(
        { error: "backend unavailable" },
        { status: 502 }
      );
    }
  }

  const draft = updateDraftStatus(params.id, status);
  if (!draft) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }
  return NextResponse.json(draft);
}
