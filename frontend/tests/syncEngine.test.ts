/**
 * Tests for SyncEngine — background sync with exponential backoff (Task D2).
 */

import "fake-indexeddb/auto";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { SyncEngine } from "../lib/syncEngine";
import { db } from "../lib/offlineDb";

describe("SyncEngine", () => {
  beforeEach(async () => {
    await db.drafts.clear();
    await db.syncQueue.clear();
  });

  it("should calculate exponential backoff delay", () => {
    const engine = new SyncEngine({
      maxRetries: 3,
      baseDelayMs: 1000,
    });

    const delay0 = engine.calculateDelay(0);
    expect(delay0).toBeGreaterThanOrEqual(1000);
    expect(delay0).toBeLessThanOrEqual(1100);

    const delay1 = engine.calculateDelay(1);
    expect(delay1).toBeGreaterThanOrEqual(2000);
    expect(delay1).toBeLessThanOrEqual(2200);

    const delay2 = engine.calculateDelay(2);
    expect(delay2).toBeGreaterThanOrEqual(4000);
    expect(delay2).toBeLessThanOrEqual(4400);
  });

  it("should respect max retries", () => {
    const engine = new SyncEngine({ maxRetries: 3 });
    expect(engine.shouldRetry(2)).toBe(true);
    expect(engine.shouldRetry(3)).toBe(false);
  });

  it("should process queue items", async () => {
    const engine = new SyncEngine({ maxRetries: 3, baseDelayMs: 10 });

    await db.queueSync({
      id: "op-1",
      type: "submit_task",
      payload: { agent: "grading", input: "test" },
      createdAt: Date.now(),
      retryCount: 0,
    });

    const submit = vi.fn().mockResolvedValue(true);
    const result = await engine.processQueue(submit);

    expect(result.processed).toBe(1);
    expect(result.failed).toBe(0);
    expect(submit).toHaveBeenCalledOnce();

    // Should be removed from queue
    const remaining = await db.getPendingSyncs();
    expect(remaining).toHaveLength(0);
  });

  it("should handle failed submissions with retry", async () => {
    const engine = new SyncEngine({ maxRetries: 3, baseDelayMs: 10 });

    await db.queueSync({
      id: "op-fail",
      type: "submit_task",
      payload: {},
      createdAt: Date.now(),
      retryCount: 0,
    });

    const submit = vi.fn().mockResolvedValue(false);
    const result = await engine.processQueue(submit);

    expect(result.processed).toBe(0);
    expect(result.failed).toBe(1);

    // Should still be in queue with incremented retry count
    const remaining = await db.getPendingSyncs();
    expect(remaining).toHaveLength(1);
    expect(remaining[0].retryCount).toBe(1);
  });
});
