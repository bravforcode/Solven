# Solven — Deep Security Audit

**Auditor:** CIPHER-AUDITOR · **Date:** 2026-08-13 · **Revision:** `d6fb282`
**Verdict:** Not production-safe for public exposure or real student data.

## Threat summary

The effective public attack surface is the unauthenticated Next.js BFF, not only
the bearer-protected FastAPI routes. A caller can read/submit/mutate data through
the BFF, and the server-side token amplifies that access. Compose also publishes a
known fallback token directly on port 8000. Student content is persisted in
plaintext SQLite/IndexedDB and may be sent to external providers. Guardrail
failures remain visible drafts, and prompt-injection controls are absent. No SQL
injection, committed real credential, direct XSS sink, model tool/RCE path, or
critical npm advisory was confirmed.

**Risk score: 2/10 (Critical risk).** Four immediate blockers, six high technical
risks, and a chained public-compromise path.

## Attack surface map

```text
Browser / Internet
  ├─ GET /api/drafts ------------------------┐
  ├─ POST /api/coordinator ------------------┤ no caller auth
  └─ PATCH /api/drafts/:id ------------------┘
        Next BFF + process-local store
          └─ server Bearer token → FastAPI
               ├─ SQLite drafts/audit (raw content)
               ├─ LLM provider (raw content when key exists)
               └─ /health + public /docs/openapi
Browser offline path → IndexedDB + Service Worker replay
Compose → public backend :8000 + known token fallback
```

## Critical findings

### SEC-C-01 — Unauthenticated Next.js API proxy

- **CVSS:** 9.9 · `CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:C/C:H/I:H/A:H`
- **Location:** `frontend/app/api/coordinator/route.ts:9-41`,
  `frontend/app/api/drafts/route.ts:4-5`,
  `frontend/app/api/drafts/[id]/route.ts:6-27`.
- **Evidence:** routes parse JSON/list/patch without session/JWT/principal checks;
  `frontend/lib/backend.ts:28-34,79-84` forwards the server token.
- **Exploit proof (synthetic instance only):**
  `curl -i http://127.0.0.1:3000/api/drafts` and unauthenticated synthetic POST/PATCH
  should currently reach the route; after remediation both must return 401/403.
- **Impact:** Cross-teacher read/write, arbitrary LLM work/cost, approval bypass.
- **Fix:** OIDC/session auth, server-derived tenant/principal, object checks,
  internal service token, route rate limits and CSRF/origin policy.

### SEC-C-02 — Known default bearer token

- **CVSS:** 9.8 · `CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H`
- **Location:** `backend/app/config.py:27-30`, `docker-compose.yml:5,26`.
- **Evidence:** `dev-secret-change-me` is a default and Compose fallback.
- **Exploit proof:** `docker compose config --no-interpolate` must never render a
  usable default in a release configuration; startup without a secret must fail.
- **Fix:** `${SOLVEN_API_TOKEN:?required}`, minimum entropy/length, deny known
  development values, rotate if used outside a disposable demo.

## High findings

### SEC-H-01 — No object-level authorization or tenant isolation

- **CVSS:** 8.1 · `CVSS:3.1/AV:N/AC:L/PR:L/UI:N/S:U/C:H/I:H/A:N`.
- **Evidence:** shared token only (`backend/app/security.py:16-27`), unscoped
  queries (`backend/app/main.py:81-97`, `db.py:107-145`), unused `teacher_id` and
  `reviewed_by` (`db.py:11-30,117-124`).
- **Fix:** authenticated claims, tenant/object predicates, RBAC, actor audit.

### SEC-H-02 — Bearer/data traffic can be cleartext

- **CVSS:** 8.1 · `CVSS:3.1/AV:A/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:N`.
- **Evidence:** direct published port (`docker-compose.yml:11-12`), plain HTTP
  runbook (`docs/DEPLOYMENT.md:30-32`), no HSTS (`backend/app/middleware.py:19-32`).
- **Fix:** TLS-only edge, private backend network, HSTS after HTTPS validation.

### SEC-H-03 — Raw student data egress to external LLMs

- **CVSS proxy:** 7.7 · `CVSS:3.1/AV:N/AC:L/PR:L/UI:N/S:C/C:H/I:N/A:N`.
- **Evidence:** raw prompt assembly (`backend/app/agents.py:32-38`), provider
  POSTs (`backend/app/llm.py:56-101`), automatic key-based selection
  (`llm.py:104-117`), raw DB storage (`db.py:19-29`).
- **Fix:** approved-region/self-hosted allowlist, redaction/pseudonymization,
  consent/residency metadata, provider DPA/no-training settings.

### SEC-H-04 — Guardrail advisory, unsafe draft still returned

- **CVSS:** 7.1 · `CVSS:3.1/AV:N/AC:L/PR:L/UI:N/S:U/C:H/I:H/A:N`.
- **Evidence:** `guardrail.py:19-33` emits warnings; `coordinator.py:87-105`
  finalizes after retry exhaustion; output is stored/returned.
- **Fix:** quarantine/redact/block; typed policy state; no copy/export of failed data.

### SEC-H-05 — Public proxy/retries enable LLM exhaustion

- **CVSS:** 7.5 · `CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:N/I:N/A:H`.
- **Evidence:** no BFF body limit (`route.ts:9-29`), up to three model attempts
  (`coordinator.py:87-93`), batch/queue replay (`page.tsx:344-420`, `sw.js:65-89`),
  no explicit output-token cap (`llm.py:87-101`).
- **Fix:** body/queue/batch caps, per-principal quotas, concurrency and spend
  budgets, edge limits, bounded retries.

### SEC-H-06 — Next.js RSC/DoS advisories potentially reachable

- **CVSS advisory:** 7.5 · `CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:N/I:N/A:H`.
- **Evidence:** `next@14.2.35` in `frontend/package.json:12-16` and lockfile;
  App Router is used.
- **Scan:** `npm audit --omit=dev` reports 2 high; full audit reports 5 high.
- **Fix:** upgrade to a supported patched release on a tested branch; do not run
  blind `npm audit fix --force`.

## Medium/low findings

| ID | Location | Risk | Fix |
|---|---|---|---|
| SEC-M-01 | `agents.py:32-38`, `llm.py:67-97` | No prompt-injection boundary/schema | Delimit untrusted data; structured output/adversarial tests |
| SEC-M-02 | `middleware.py:14-16,58-76` | Process-local IP limiter | Redis/edge quotas, trusted proxy, bounded buckets |
| SEC-M-03 | BFF route; `main.py:81-97` | Unbounded parse/list responses | body caps, strict schemas, pagination/projection |
| SEC-M-04 | `backend.ts:56-70`; PATCH route | Fail-open mock + ignored mirror | production fail-closed; durable approval |
| SEC-M-05 | `offlineQueue.ts:3-9,33-64`; `page.tsx:537-555` | Plaintext browser data | bind/expire/purge/minimize; disable when needed |
| SEC-M-06 | `db.py:19-43`; compose volume | No privacy lifecycle/ownership | encryption, retention/delete, FK/tenant controls |
| SEC-M-07 | `main.py:30-39`; `db.py:47-57`; `migrate.py` | DB path/migration defects | normalize Path; readiness; transaction/lock |
| SEC-M-08 | `llm.py:120-121`; `coordinator.py:77-85` | Short hashes/timestamp race/no actor | full hashes, immutable events, task IDs/actor |
| SEC-M-09 | CORS/middleware/next config | Wildcards, no HSTS/no-store, weakened CSP | strict allowlists and edge/application headers |
| SEC-M-10 | Dockerfiles, CI, requirements | Root/floating/unlocked/no scans | pin, hash, non-root, SBOM/CVE/secret gates |
| SEC-M-11 | `layout.tsx:91-94` | Env-controlled JSON-LD inline sink | validate and escape URL or metadata API |
| SEC-M-12 | `sw.js`; `page.tsx:503-528` | Queue/export replay trust | TTL/limits, identity, redacted/audited export |
| SEC-M-13 | README/SECURITY/architecture docs | Prototype/production mismatch | explicit release blocker language |
| SEC-L-01 | `middleware.py:38-45` | Unbounded client request ID | bounded UUID format/server-generated IDs |
| SEC-L-02 | `main.py:41,70-72` | Public docs/version metadata | protect docs; minimal health response |

## Security headers

| Control | Current | Assessment |
|---|---|---|
| X-Content-Type-Options | Present | Keep |
| X-Frame-Options | Present | Keep |
| Referrer-Policy | Present | Keep |
| CSP | Present; inline allowed | Required for current hydration; test nonce migration |
| Permissions-Policy | Backend only | Add frontend policy |
| HSTS | Absent in repo | Enforce at verified HTTPS edge |
| Cache-Control no-store | Absent | Add to drafts/audit/API responses |
| COOP/CORP | Absent | Add where compatible |
| CORS methods/headers | Wildcard | Narrow to required methods/headers |

## Dependency and secrets results

- No real API keys, private keys, or committed `.env` files found.
- Known development token appears in `config.py:29` and Compose defaults; rotate
  if ever used outside disposable demos.
- `npm audit --omit=dev`: 2 high; full audit: 5 high; 0 critical.
- Next RSC DoS advisories may be reachable; Image Optimizer, rewrites, Pages Router,
  Server Actions, and WebSocket paths were not evidenced in this app.
- Python resolver scan from delegated audit found no known vulnerabilities, but the
  repository has only lower-bound requirements and no hashes/lockfile, so drift is
  possible. Local `pip_audit` binary was not installed.

## Exploit chains

1. **Public compromise:** SEC-C-01 → privileged server token → SEC-H-01 → bulk
   student-data read/write; SEC-C-02 independently gives direct backend access.
2. **Unsafe approved output:** SEC-M-01 → model injection/fabrication → SEC-H-04
   warning-only → SEC-M-12 copy/export.
3. **PDPA egress/persistence:** raw browser/queue → SEC-H-03 external provider →
   SEC-M-06 plaintext SQLite with no expiry.
4. **Compose failure/mock:** SEC-M-07 persistence 500 → SEC-M-04 mock 200 → no
   backend audit/guardrail/tenant guarantees.
5. **Cost exhaustion:** SEC-C-01 → SEC-H-05 retries/batches → SEC-M-02 limiter
   bypass across instances.

## Release gate

Do not process real student data or expose the app publicly until SEC-C-01/02,
SEC-H-01/02/03/04/05/06 are remediated and the following pass: tenant isolation,
provider-boundary test, default-secret preflight, persisted Compose smoke, offline
storage lifecycle test, dependency scan, and TLS/readiness verification.
