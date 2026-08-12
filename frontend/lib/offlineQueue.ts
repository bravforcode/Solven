import { AgentType } from "./types";

export interface QueuedTask {
  clientTaskId: string;
  agent: AgentType;
  input: string;
  rubric?: string;
  createdAt: string;
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
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readwrite");
      tx.objectStore(STORE_NAME).put(task);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
    db.close();
  },
  async list() {
    const db = await openDb();
    const tasks = await new Promise<QueuedTask[]>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readonly");
      const req = tx.objectStore(STORE_NAME).getAll();
      req.onsuccess = () => resolve(req.result as QueuedTask[]);
      req.onerror = () => reject(req.error);
    });
    db.close();
    return tasks;
  },
  async remove(clientTaskId) {
    const db = await openDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readwrite");
      tx.objectStore(STORE_NAME).delete(clientTaskId);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
    db.close();
  },
};

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
  const tasks = await store.list();
  let flushed = 0;
  for (const task of tasks) {
    const ok = await submit(task);
    if (ok) {
      await store.remove(task.clientTaskId);
      flushed++;
    }
  }
  return flushed;
}
