import { describe, expect, it, beforeEach } from "vitest";
import { addDraft, listDrafts, updateDraftStatus } from "@/lib/store";
import type { Draft } from "@/lib/types";

function draft(id: string, status: Draft["status"] = "pending"): Draft {
  return {
    id,
    agent: "grading",
    input: "i",
    output: "o",
    status,
    warnings: [],
    createdAt: new Date().toISOString(),
  };
}

// store.ts captures the array reference at module load — clear it in place
// (listDrafts() returns the live array).
beforeEach(() => {
  listDrafts().splice(0);
});

describe("in-memory draft store", () => {
  it("adds and lists newest-first", () => {
    addDraft(draft("a"));
    addDraft(draft("b"));
    expect(listDrafts().map((d) => d.id)).toEqual(["b", "a"]);
  });

  it("dedupes by id (replace, not append)", () => {
    addDraft(draft("a"));
    const updated = { ...draft("a"), status: "approved" as const };
    addDraft(updated);
    expect(listDrafts()).toHaveLength(1);
    expect(listDrafts()[0].status).toBe("approved");
  });

  it("updates status in place and returns the draft", () => {
    addDraft(draft("a"));
    const res = updateDraftStatus("a", "rejected");
    expect(res?.status).toBe("rejected");
    expect(listDrafts()[0].status).toBe("rejected");
  });

  it("returns undefined for unknown id", () => {
    expect(updateDraftStatus("missing", "approved")).toBeUndefined();
  });
});
