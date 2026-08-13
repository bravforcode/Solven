// Minimal service worker — caches the app shell so the demo opens on
// slow/flaky connections (offline-first direction, Appendix A.8).
const CACHE = "solven-v1";
const SHELL = ["/", "/manifest.webmanifest", "/icon.svg"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);
  // API calls always go to network (never serve stale drafts)
  if (url.pathname.startsWith("/api/")) return;
  // T1-06 (AUD-H-05): runtime-cache immutable Next.js build assets so a
  // cold offline reload has the JS/CSS it needs to hydrate.
  if (url.pathname.startsWith("/_next/static/")) {
    event.respondWith(
      caches.open(CACHE).then(async (cache) => {
        const hit = await cache.match(event.request);
        if (hit) return hit;
        const res = await fetch(event.request);
        if (res.ok) cache.put(event.request, res.clone());
        return res;
      })
    );
    return;
  }
  event.respondWith(
    caches.match(event.request).then((hit) => hit || fetch(event.request))
  );
});

// Offline queue flush (Appendix A.8). Mirrors the IndexedDB schema in
// lib/offlineQueue.ts (db "solven-offline", store "queue", keyPath
// "clientTaskId") — plain JS here since the SW script isn't bundled/ESM.
const QUEUE_DB = "solven-offline";
const QUEUE_STORE = "queue";

function openQueueDb() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(QUEUE_DB, 1);
    req.onupgradeneeded = () => {
      req.result.createObjectStore(QUEUE_STORE, { keyPath: "clientTaskId" });
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function listQueued(db) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(QUEUE_STORE, "readonly");
    const req = tx.objectStore(QUEUE_STORE).getAll();
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function removeQueued(db, clientTaskId) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(QUEUE_STORE, "readwrite");
    tx.objectStore(QUEUE_STORE).delete(clientTaskId);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

async function flushOfflineQueue() {
  const db = await openQueueDb();
  const tasks = await listQueued(db);
  let flushed = 0;
  const QUEUE_TTL_MS = 7 * 24 * 60 * 60 * 1000; // keep in sync with lib/offlineQueue.ts
  for (const task of tasks) {
    // never replay stale queued student content (T1-05)
    const created = new Date(task.createdAt).getTime();
    if (Number.isNaN(created) || Date.now() - created > QUEUE_TTL_MS) {
      await removeQueued(db, task.clientTaskId);
      continue;
    }
    try {
      const res = await fetch("/api/coordinator", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          agent: task.agent,
          input: task.input,
          rubric: task.rubric,
          client_task_id: task.clientTaskId,
        }),
      });
      if (res.ok) {
        await removeQueued(db, task.clientTaskId);
        flushed++;
      }
    } catch {
      // still offline / request failed — leave queued, retry on next sync
    }
  }
  db.close();
  if (flushed > 0) {
    const clients = await self.clients.matchAll();
    for (const client of clients) {
      client.postMessage({ type: "solven-sync-flushed", flushed });
    }
  }
}

self.addEventListener("sync", (event) => {
  if (event.tag === "solven-sync") {
    event.waitUntil(flushOfflineQueue());
  }
});
