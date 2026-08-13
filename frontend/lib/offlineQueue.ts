import { AgentType } from "./types";

export interface QueuedTask {
  clientTaskId: string;
  agent: AgentType;
  input: string;
  rubric?: string;
  createdAt: string;
}

// T1-05 (AUD-H-04): bounded, expiring offline storage — raw student content
// must not live in browser storage indefinitely.
export const QUEUE_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days (assumed pilot policy)
export const MAX_QUEUED_TASKS = 500;

export function isExpired(task: QueuedTask, now: number = Date.now()): boolean {
  const created = new Date(task.createdAt).getTime();
  if (Number.isNaN(created)) return true;
  return now - created > QUEUE_TTL_MS;
}

/** Storage seam — lets tests swap IndexedDB for an in-memory fake. */
export interface QueueStore {
  enqueue(task: QueuedTask): Promise<void>;
  list(): Promise<QueuedTask[]>;
  remove(clientTaskId: string): Promise<void>;
}

const DB_NAME = "solven-offline";
const STORE_NAME = "queue";
const DB_VERSION = 1;

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      req.result.createObjectStore(STORE_NAME, { keyPath: "clientTaskId" });
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export const indexedDbStore: QueueStore = {
  async enqueue(task) {
    const db = await openDb();
    try {
      // bound the queue: refuse new entries when full (caller shows the error)
      const current = await listQueuedRaw(db);
      if (current.length >= MAX_QUEUED_TASKS) {
        throw new Error(`queue full (max ${MAX_QUEUED_TASKS} pending tasks)`);
      }
      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, "readwrite");
        tx.objectStore(STORE_NAME).put(task);
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      });
    } finally {
      db.close();
    }
  },
  async list() {
    const db = await openDb();
    try {
      const all = await listQueuedRaw(db);
      // drop expired entries while listing
      const expired = all.filter((t) => isExpired(t));
      for (const t of expired) {
        await new Promise<void>((resolve, reject) => {
          const tx = db.transaction(STORE_NAME, "readwrite");
          tx.objectStore(STORE_NAME).delete(t.clientTaskId);
          tx.oncomplete = () => resolve();
          tx.onerror = () => reject(tx.error);
        });
      }
      return all.filter((t) => !isExpired(t));
    } finally {
      db.close();
    }
  },
  async remove(clientTaskId) {
    const db = await openDb();
    try {
      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, "readwrite");
        tx.objectStore(STORE_NAME).delete(clientTaskId);
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      });
    } finally {
      db.close();
    }
  },
};

async function listQueuedRaw(db: IDBDatabase): Promise<QueuedTask[]> {
  return new Promise<QueuedTask[]>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readonly");
    const req = tx.objectStore(STORE_NAME).getAll();
    req.onsuccess = () => resolve(req.result as QueuedTask[]);
    req.onerror = () => reject(req.error);
  });
}

export function enqueueTask(
  task: QueuedTask,
  store: QueueStore = indexedDbStore
): Promise<void> {
  return store.enqueue(task);
}

export function listQueuedTasks(
  store: QueueStore = indexedDbStore
): Promise<QueuedTask[]> {
  return store.list();
}

/**
 * Submits every queued task via `submit`, removing each on success.
 * Stops counting a task as flushed if `submit` returns false — server-wins,
 * the task stays queued for the next sync attempt (Appendix A.8).
 */
export async function flushQueue(
  submit: (task: QueuedTask) => Promise<boolean>,
  store: QueueStore = indexedDbStore
): Promise<number> {
  const tasks = await store.list(); // list() already purges expired entries
  let flushed = 0;
  for (const task of tasks) {
    if (isExpired(task)) continue; // belt & braces: never replay stale data
    const ok = await submit(task);
    if (ok) {
      await store.remove(task.clientTaskId);
      flushed++;
    }
  }
  return flushed;
}
