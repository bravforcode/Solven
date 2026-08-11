import { Draft } from "./types";

// In-memory store for the prototype. Resets on server restart —
// swap for a real DB before this becomes more than a demo.
//
// Stashed on globalThis so the array survives Next.js dev-mode's
// per-route module recompilation (each API route can otherwise get
// its own module instance and "lose" state written by another route).
const globalForStore = globalThis as unknown as { __solvenDrafts?: Draft[] };

const drafts: Draft[] = globalForStore.__solvenDrafts ?? [];
globalForStore.__solvenDrafts = drafts;

export function addDraft(draft: Draft): void {
  drafts.unshift(draft);
}

export function listDrafts(): Draft[] {
  return drafts;
}

export function updateDraftStatus(
  id: string,
  status: Draft["status"]
): Draft | undefined {
  const draft = drafts.find((d) => d.id === id);
  if (draft) draft.status = status;
  return draft;
}
