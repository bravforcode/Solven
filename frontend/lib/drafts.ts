import type { Draft } from "@/lib/types";

/** PATCH a draft status (approved/rejected for decisions; "pending" for undo); returns the updated draft or null. */
export async function patchDraftStatus(
  id: string,
  status: "approved" | "rejected" | "pending"
): Promise<Draft | null> {
  try {
    const res = await fetch(`/api/drafts/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    if (!res.ok) return null;
    return (await res.json()) as Draft;
  } catch {
    return null;
  }
}

export type StatusPatchFn = (id: string, status: "approved" | "rejected") => Promise<boolean>;

/** Sequential batch PATCH over pending drafts; returns ok count + failed ids. */
export async function applyBatch(
  drafts: Draft[],
  status: "approved" | "rejected",
  patchFn: StatusPatchFn = async (id, s) => (await patchDraftStatus(id, s)) !== null
): Promise<{ ok: number; fail: string[] }> {
  const fail: string[] = [];
  let ok = 0;
  for (const d of drafts) {
    if (d.status !== "pending") continue;
    const success = await patchFn(d.id, status);
    if (success) ok++;
    else fail.push(d.id);
  }
  return { ok, fail };
}
