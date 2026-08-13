import { NextRequest, NextResponse } from "next/server";
import { patchDraft } from "@/lib/backend";
import { listDrafts, updateDraftStatus } from "@/lib/store";
import { DraftStatus } from "@/lib/types";

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { status } = (await req.json()) as { status: DraftStatus };

  if (status !== "approved" && status !== "rejected") {
    return NextResponse.json({ error: "invalid status" }, { status: 400 });
  }

  const existing = listDrafts().find((d) => d.id === params.id);
  if (!existing) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  // AUD-H-06: backend-authoritative — for backend drafts, the mirror must
  // succeed BEFORE the local status changes. Fail closed, no optimistic update.
  if (existing.engine === "backend") {
    const ok = await patchDraft(existing.id, status);
    if (!ok) {
      return NextResponse.json(
        { error: "backend unavailable" },
        { status: 502 }
      );
    }
  }

  const draft = updateDraftStatus(params.id, status);
  return NextResponse.json(draft);
}
