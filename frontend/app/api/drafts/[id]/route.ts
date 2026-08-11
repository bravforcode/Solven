import { NextRequest, NextResponse } from "next/server";
import { updateDraftStatus } from "@/lib/store";
import { DraftStatus } from "@/lib/types";

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { status } = (await req.json()) as { status: DraftStatus };

  if (status !== "approved" && status !== "rejected") {
    return NextResponse.json({ error: "invalid status" }, { status: 400 });
  }

  const draft = updateDraftStatus(params.id, status);
  if (!draft) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  return NextResponse.json(draft);
}
