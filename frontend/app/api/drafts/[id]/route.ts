import { NextRequest, NextResponse } from "next/server";
import { patchDraft } from "@/lib/backend";
import { updateDraftStatus } from "@/lib/store";
import { DraftStatus } from "@/lib/types";

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { status } = (await req.json()) as { status: DraftStatus };

  // "pending" allowed for undo (toast action) — additive; approved/rejected unchanged.
  if (status !== "approved" && status !== "rejected" && status !== "pending") {
    return NextResponse.json({ error: "invalid status" }, { status: 400 });
  }

  const draft = updateDraftStatus(params.id, status);
  if (!draft) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  // best-effort: mirror teacher decision to the backend audit trail
  // (fails soft — local status already updated above regardless).
  // "pending" (undo) is not mirrored — backend PATCH accepts only final states.
  if (draft.engine === "backend" && (status === "approved" || status === "rejected")) {
    await patchDraft(draft.id, status);
  }

  return NextResponse.json(draft);
}
