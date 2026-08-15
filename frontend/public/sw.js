// Minimal service worker — caches the app shell so the demo opens on
// slow/flaky connections (offline-first direction, Appendix A.8).
// v2 (2026-08-15): bumped cache name + network-first shell so redeploys are
// never stuck behind a stale cached HTML/CSS (the "broken CSS" symptom).
// v3 (2026-08-15): /_next/static switched to NETWORK-FIRST — cache-first
// served stale JS chunks against fresh HTML (hydration mismatch "Expected
// server HTML to contain a matching <span>"). Network-first with cache
// fallback keeps offline support while guaranteeing chunk freshness.
const CACHE = "solven-v4";
const SHELL = ["/", "/manifest.webmanifest"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((c) => Promise.all(SHELL.map((url) => c.add(url).catch(() => null))))
      .then(() => self.skipWaiting())
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
  // T1-06 (AUD-H-05): runtime-cache Next.js build assets so a cold offline
  // reload has the JS/CSS it needs to hydrate. NETWORK-FIRST: dev-mode chunk
  // URLs are stable across edits, so cache-first can pair fresh HTML with
  // stale JS (hydration failure). Fall back to cache only when offline.
  if (url.pathname.startsWith("/_next/static/")) {
    event.respondWith(
      fetch(event.request)
        .then((res) => {
          if (res.ok) {
            const copy = res.clone();
            caches.open(CACHE).then((c) => c.put(event.request, copy));
          }
          return res;
        })
        .catch(() => caches.match(event.request))
    );
    return;
  }
  // Navigations / shell: NETWORK FIRST, cache fallback — fresh app shell on
  // every visit, offline still works. Prevents stale-CSS-on-redeploy.
  event.respondWith(
    fetch(event.request)
      .then((res) => {
        if (res.ok) {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(event.request, copy));
        }
        return res;
      })
      .catch(() => caches.match(event.request))
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
  // NOTE (prod): the offline flush depends on a cookie/session-based edge —
  // same-origin fetch() from the SW carries cookies, so the identity edge can
  // inject x-solven-principal. Token-only edge deployments MUST disable the
  // offline queue (requests would 401 and the queue would never drain).
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
