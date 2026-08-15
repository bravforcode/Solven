import { describe, expect, it } from "vitest";
import {
  isExpired,
  flushQueue,
  MAX_QUEUED_TASKS,
  QUEUE_TTL_MS,
  type QueueStore,
  type QueuedTask,
} from "@/lib/offlineQueue";

function task(createdAt: string, id = "t1"): QueuedTask {
  return { clientTaskId: id, agent: "lesson-plan", input: "หัวข้อ: การบวกเศษส่วน", createdAt };
}

function fakeStore(initial: QueuedTask[] = []) {
  const store: QueueStore & { items: QueuedTask[]; removed: string[] } = {
    items: [...initial],
    removed: [],
    async enqueue(t: QueuedTask) {
      if (this.items.length >= MAX_QUEUED_TASKS) {
        throw new Error(`queue full (max ${MAX_QUEUED_TASKS} pending tasks)`);
      }
      this.items.push(t);
    },
    async list() {
      return this.items.filter((t) => !isExpired(t));
    },
    async remove(clientTaskId: string) {
      this.removed.push(clientTaskId);
      this.items = this.items.filter((t) => t.clientTaskId !== clientTaskId);
    },
  };
  return store;
}

describe("isExpired (7-day TTL, AUD-H-04)", () => {
  it("fresh task is not expired", () => {
    const now = Date.now();
    expect(isExpired(task(new Date(now - 1000).toISOString()), now)).toBe(false);
  });

  it("task older than TTL is expired", () => {
    const now = Date.now();
    const old = new Date(now - QUEUE_TTL_MS - 60_000).toISOString();
    expect(isExpired(task(old), now)).toBe(true);
  });

  it("invalid date is treated as expired (fail safe)", () => {
    expect(isExpired(task("not-a-date"))).toBe(true);
  });
});

describe("flushQueue", () => {
  it("removes tasks only after successful submit, returns flushed count", async () => {
    const store = fakeStore([
      task(new Date().toISOString(), "a"),
      task(new Date().toISOString(), "b"),
    ]);
    const submitted: string[] = [];
    const count = await flushQueue(async (t) => {
      submitted.push(t.clientTaskId);
      return true;
    }, store);
    expect(count).toBe(2);
    expect(submitted).toEqual(["a", "b"]);
    expect(store.removed).toEqual(["a", "b"]);
    expect(store.items).toEqual([]);
  });

  it("keeps tasks when submit returns false (server-wins)", async () => {
    const store = fakeStore([task(new Date().toISOString(), "a")]);
    const count = await flushQueue(async () => false, store);
    expect(count).toBe(0);
    expect(store.items).toHaveLength(1);
    expect(store.removed).toEqual([]);
  });

  it("never replays expired tasks even if submit succeeds", async () => {
    const old = new Date(Date.now() - QUEUE_TTL_MS - 60_000).toISOString();
    const store = fakeStore([
      task(new Date().toISOString(), "fresh"),
      task(old, "stale"),
    ]);
    let submitted = 0;
    const count = await flushQueue(async () => {
      submitted++;
      return true;
    }, store);
    expect(count).toBe(1);
    expect(submitted).toBe(1);
    expect(store.items.map((t) => t.clientTaskId)).toEqual(["stale"]);
  });
});
