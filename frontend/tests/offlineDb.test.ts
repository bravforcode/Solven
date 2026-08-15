/**
 * Tests for SolvenDB — Dexie.js IndexedDB schema (Task D1).
 *
 * Note: Uses fake-indexeddb for Node.js test environment.
 * Run with: npx vitest run tests/offlineDb.test.ts
 */

import "fake-indexeddb/auto";
import { describe, it, expect, beforeEach } from "vitest";
import { SolvenDB } from "../lib/offlineDb";

describe("SolvenDB", () => {
  let db: SolvenDB;

  beforeEach(async () => {
    db = new SolvenDB();
    // Clear all data between tests
    await db.drafts.clear();
    await db.syncQueue.clear();
  });

  it("should store draft offline", async () => {
    await db.addDraft({
      id: "test-1",
      agent: "grading",
      input: "คำตอบนักเรียน",
      output: "",
      status: "pending",
      createdAt: Date.now(),
    });
    const drafts = await db.getAllDrafts();
    expect(drafts).toHaveLength(1);
    expect(drafts[0].id).toBe("test-1");
  });

  it("should queue sync operation", async () => {
    await db.queueSync({
      id: "sync-1",
      type: "submit_task",
      payload: { agent: "grading", input: "test" },
      createdAt: Date.now(),
      retryCount: 0,
    });
    const queue = await db.getPendingSyncs();
    expect(queue).toHaveLength(1);
  });

  it("should mark sync as completed", async () => {
    await db.queueSync({
      id: "sync-2",
      type: "submit_task",
      payload: {},
      createdAt: Date.now(),
      retryCount: 0,
    });
    await db.markSyncCompleted("sync-2");
    const queue = await db.getPendingSyncs();
    expect(queue).toHaveLength(0);
  });

  it("should increment retry count", async () => {
    await db.queueSync({
      id: "sync-3",
      type: "submit_task",
      payload: {},
      createdAt: Date.now(),
      retryCount: 0,
    });
    await db.incrementRetry("sync-3", "network error");
    const queue = await db.getPendingSyncs();
    expect(queue[0].retryCount).toBe(1);
    expect(queue[0].lastError).toBe("network error");
  });
});
