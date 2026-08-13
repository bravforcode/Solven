# Solven — Ultra Project Audit

**Auditor:** APEX-AUDITOR (evidence synthesized from independent read-only audits)
**Date:** 2026-08-13 · **Revision:** `d6fb282`
**Project type:** Pre-launch Thai education web app + LLM workflow
**Scope:** Frontend, backend, persistence, auth, offline path, CI, Docker, Compose,
dependencies, deployment and architecture docs
**Confidence:** High for repository findings; low for external deployment facts

## Executive summary

Solven is a credible prototype with a readable codebase, strict TypeScript,
Pydantic input limits, human approval states, a provider seam, security headers,
and a passing local test/build baseline. It is not safe for public exposure or
real student data yet. The highest-risk combination is an unauthenticated Next.js
BFF, a shared/default bearer token, unscoped draft storage, and a fallback that
turns backend failures into successful-looking mock drafts. The Docker Compose
launch path has two independently confirmed defects: a string SQLite path crashes
API persistence while `/health` remains green, and the frontend container targets
its own `localhost` instead of the backend service. Raw student data can also be
stored indefinitely in SQLite/IndexedDB and sent to external LLM providers when
keys are present. Local checks passing therefore does not establish launch safety.

## Overall health score: 34/100

| Dimension | Score | Evidence basis |
|---|---:|---|
| Architecture & system design | 4/10 | Split authorities; broken persistence/config seams |
| Code quality & maintainability | 5/10 | Readable code; large page and broad fallback paths |
| Security | 2/10 | Public BFF, default token, no tenant/object auth |
| Performance & efficiency | 4/10 | Unbounded reads; synchronous per-request LLM graph |
| Testing & QA | 3/10 | Backend unit tests only; no frontend/Compose/E2E |
| Data layer & database | 2/10 | Plaintext PII; SQLite lifecycle/concurrency gaps |
| API design & contracts | 3/10 | Unversioned, unbounded, divergent proxy contract |
| DevOps & infrastructure | 3/10 | No launch-path smoke/readiness/DR gate |
| Dependencies & supply chain | 4/10 | 2 production / 5 full npm high advisories |
| Documentation & DX | 6/10 | Honest target docs; conflicting runbook/config |
| Observability & operability | 3/10 | Request context exists; no emitted JSON/metrics |
| Accessibility/compliance/platform fit | 3/10 | UI signals present; PDPA controls target-only |
| ML/AI supplement | 2/10 | No injection boundary; unsafe output remains draft |

## Baseline and evidence boundary

- Backend: `python -m pytest -q` → **32 passed**, one Starlette deprecation warning.
- Frontend: `npm run lint`, `npm run typecheck`, `npm run build` → pass.
- Full `npm audit --json`: **5 high**, 0 critical.
- Production-only `npm audit --omit=dev`: **2 high**, 0 critical.
- `docker compose config`: pass; Docker Linux engine unavailable for runtime test.
- `npx ruflo --version`: `v3.32.8`.
- Direct synthetic probe: `Store('/data/solven.db')._c()` raises
  `AttributeError: 'str' object has no attribute 'parent'`.
- Production URL, DNS, TLS, ingress, secrets, traffic, provider region, backup,
  and actual current `ERR_CONNECTION_REFUSED` logs were not supplied.

## Critical findings — block public launch

### AUD-C-01 — Persisted SQLite path crashes API requests

- **Location:** `docker-compose.yml:5-6`; `backend/app/main.py:30-39`;
  `backend/app/db.py:47-57` (`_conn`).
- **Evidence:** Compose supplies string `/data/solven.db`; `create_app()` passes
  `settings.db_path` directly to `Store`; `_conn()` calls `path.parent`.
- **Impact:** `/health` can be 200 while draft creation, approval, and audit
  requests fail with 500 in the persisted Compose path.
- **Fix:** Normalize the effective DB path to `Path` once; use the same path for
  migrations and `Store`; add a file-backed API smoke test.
- **Verify:** create, patch, list, and audit a draft using a temporary file DB.
- **Effort:** 4h · **Confidence:** 0.99.

### AUD-C-02 — Known default bearer token remains accepted

- **Location:** `backend/app/config.py:27-30`; `docker-compose.yml:5,26`.
- **Evidence:** `api_token` defaults to `dev-secret-change-me`; Compose repeats it
  when `SOLVEN_API_TOKEN` is absent.
- **Impact:** A published backend with omitted/misspelled configuration is fully
  readable and mutable with a documented credential.
- **Fix:** Require a supplied production secret of at least 32 random characters;
  reject known development values; use `${SOLVEN_API_TOKEN:?required}` in release
  Compose; rotate any token used outside disposable demos.
- **Verify:** production preflight fails without/with the default; protected API
  never accepts the default.
- **Effort:** 2h · **Confidence:** 0.99.

### AUD-C-03 — Public Next.js BFF exposes unauthenticated data/actions

- **Location:** `frontend/app/api/coordinator/route.ts:9-41`;
  `frontend/app/api/drafts/route.ts:4-5`;
  `frontend/app/api/drafts/[id]/route.ts:6-27`.
- **Evidence:** Routes parse requests and call the privileged server-side token
  path without checking a caller identity. `frontend/lib/store.ts:9-34` is global.
- **Impact:** Any reachable client can list drafts, submit LLM work, and approve or
  reject another teacher’s draft; the BFF can spend the backend token for them.
- **Fix:** Add OIDC/JWT/session authentication, derive principal and tenant on the
  server, enforce object ownership, and keep the service token internal.
- **Verify:** unauthenticated routes return 401/403; two synthetic principals are
  isolated for list, submit, and patch.
- **Effort:** 16h for first vertical slice · **Confidence:** 0.99.

### AUD-C-04 — Optional LLM path sends raw student data externally

- **Location:** `backend/app/agents.py:32-38`; `backend/app/llm.py:56-117`.
- **Evidence:** Raw input/rubric becomes provider request content; provider choice
  auto-activates when `ANTHROPIC_API_KEY` or `OPENAI_API_KEY` exists.
- **Impact:** Student answers/rubrics can cross the intended Thai/approved
  inference boundary without redaction, consent, or residency enforcement.
- **Fix:** Explicit approved-provider policy, pseudonymization/redaction, consent
  metadata, and production refusal for unapproved external providers.
- **Verify:** mocked provider transport asserts identifiers never leave the approved
  boundary; startup rejects unsafe provider configuration.
- **Effort:** 12h · **Confidence:** 0.98.

## High findings — fix before controlled pilot

### AUD-H-01 — Shared bearer auth has no principal, tenant, or object authorization

`backend/app/security.py:16-27` validates only one token. `main.py:81-97` returns
unscoped drafts/audit rows and `db.py:11-30,117-124` never populates or checks
`teacher_id`/`reviewed_by`. Add identity, tenant predicates, RBAC and actor audit.
**Effort:** 12h · **Confidence:** 0.99.

### AUD-H-02 — Backend failures become HTTP 200 mock success

`frontend/lib/backend.ts:27-70` catches all errors and returns a mock-shaped draft;
`frontend/app/api/coordinator/route.ts:31-41` returns it normally. Gate mocks behind
explicit demo mode and propagate 401/4xx/5xx in production. **Effort:** 4h.

### AUD-H-03 — Compose frontend cannot reach backend reliably

`docker-compose.yml:24-26` sets `http://localhost:8000`, but server-side fetch runs
inside the frontend container. Use server-only `SOLVEN_BACKEND_URL=http://backend:8000`
and add a Compose API smoke. **Effort:** 4h.

### AUD-H-04 — Offline queue stores raw student content indefinitely

`frontend/app/page.tsx:413-419` enqueues raw input/rubric; `offlineQueue.ts:18-64`
has no user binding, TTL, size cap, logout purge, or clear-data control. Scope,
expire, minimize, and document shared-device behavior. **Effort:** 8h.

### AUD-H-05 — Service worker does not cache Next.js assets

`frontend/public/sw.js:3-27` precaches only `/`, manifest, and icon. Offline reload
may return HTML without `/_next/static` JS/CSS, so hydration and queue controls fail.
Precache/runtime-cache immutable same-origin assets and test cold offline reload.
**Effort:** 8h.

### AUD-H-06 — Approval status can diverge from backend

`frontend/app/api/drafts/[id]/route.ts:16-27` mutates local state first and ignores
`patchDraft()` failure. Make backend authoritative; return 502/409 and revert local
state when mirror fails. **Effort:** 4h.

### AUD-H-07 — Guardrail failures are warning-only and PII detection is incomplete

`coordinator.py:87-105` finalizes after retries even when `guardrail.py:19-33`
fails; output is stored/returned. Quarantine or redact failed outputs and expand
tested Thai/international PII patterns. **Effort:** 8h.

### AUD-H-08 — Untrusted text enters LLM prompt without an injection boundary

`backend/app/agents.py:32-38` concatenates rubric and student text. Delimit
untrusted fields, require structured output, validate score/rubric linkage, and add
adversarial regression tests. **Effort:** 8h.

### AUD-H-09 — No retention, deletion, or student-data minimization mechanism

`backend/app/db.py:19-29,96-145` stores raw input/output with no expiry/deletion API;
`docs/DEPLOYMENT.md:64` lists retention only as a checkbox. Add lifecycle metadata,
purge/delete, backup expiry, access audit and pseudonymous IDs. **Effort:** 12h.

### AUD-H-10 — Client idempotency key is not atomically scoped or hash-bound

`schema.py:13-15`, `coordinator.py:133-155`, and `db.py:19-30` allow same-key
different-payload/concurrent replay races. Persist principal+key+request hash with
pending/result state and reject mismatches. **Effort:** 8h.

### AUD-H-11 — Process-local limiter is not cost/concurrency aware

`middleware.py:58-76` limits per process/IP; each request can trigger up to three
LLM attempts (`coordinator.py:87-93`). Add trusted-IP handling, Redis/edge quotas,
concurrency semaphore and per-request cost budget. **Effort:** 8h.

### AUD-H-12 — Liveness health check reports green during API failure

`main.py:70-72` checks nothing beyond process existence and Compose probes only it.
Split `/live` and `/readyz`; readiness must verify schema/writeability and protected
API path. **Effort:** 4h.

### AUD-H-13 — Grading accepts missing rubric and mock emits fixed score

`schema.py:9-13` makes rubric optional; `llm.py:27-35` returns a fixed 7.5/10 mock;
Compose selects `SOLVEN_LLM=mock`. Require rubric for grading and prohibit mock in
production release configuration. **Effort:** 4h.

### AUD-H-14 — Launch checklist is advisory, not an enforced release gate

`README.md:78-84` and `docs/DEPLOYMENT.md:55-66` can be skipped while defaults,
mock mode, placeholder URL, localhost CORS, and no backup remain. Add a preflight
that fails unsafe release config. **Effort:** 4h.

## Medium findings — schedule after blockers

| ID | Evidence | Required outcome | Effort |
|---|---|---|---:|
| AUD-M-01 | BFF `route.ts:9-29`; schema only at backend | Runtime validation, body cap, strict fields, preserved 4xx | 4h |
| AUD-M-02 | `main.py:81-97`; `db.py:107-145` | Versioned cursor pagination and response projection | 8h |
| AUD-M-03 | `config.py:36-37`; `main.py:34-39` | Migrate effective default DB path at startup | 3h |
| AUD-M-04 | `migrate.py:31-41` | Lock and transactionally apply migrations | 6h |
| AUD-M-05 | `db.py:51-78` | WAL/busy timeout for pilot; PostgreSQL gate before scale | 8h |
| AUD-M-06 | `coordinator.py:36-37,107-123`; `page.tsx:388-408` | Cache graph/client; bound batch concurrency | 6h |
| AUD-M-07 | `llm.py:60-101`; `coordinator.py:49-58` | Typed timeout/provider error classification | 4h |
| AUD-M-08 | `frontend/package.json:5-10`; CI; in-memory tests | Route, browser, persisted DB, Compose, E2E coverage | 12h |
| AUD-M-09 | `requirements.txt:1-7`; Next/PostCSS lock | Patched Next/PostCSS and reproducible backend lock | 8h |
| AUD-M-10 | Both Dockerfiles | Digests, non-root, read-only/resource limits | 4h |
| AUD-M-11 | Runbook vs `docker-compose.yml:4-8` | One explicit env/secret injection contract | 4h |
| AUD-M-12 | `main.py:25`; middleware `extra` | Emitted JSON logs, metrics, alerts | 8h |
| AUD-M-13 | `next.config.js:11-25`; no HSTS | Nonce CSP after RSC validation; HSTS at TLS edge | 8h |
| AUD-M-14 | Compose volume; deployment checklist | Encrypted off-host backup, restore drill, RPO/RTO | 12h |
| AUD-M-15 | `page.tsx:145-155,503-533` | Authorized, redacted, auditable exports | 6h |
| AUD-M-16 | `page.tsx:271-326`; `offlineQueue.ts:22-30` | Storage feature detection and visible recovery | 4h |

## Low findings

- **AUD-L-01:** `layout.tsx:13-17`, `robots.ts`, `sitemap.ts` default to
  `https://solven.example.com`; fail production build if unset/placeholder (1h).
- **AUD-L-02:** `layout.tsx:3,7-10` and Docker build depend on Google font fetch;
  self-host or make network preflight explicit (1h).

## Site reachability assessment

The historical click-dead issue is fixed in `0b3e5a8`: production CSP retains
`script-src 'self' 'unsafe-inline'` because Next RSC hydration requires inline
payloads. Fresh local build passed. The current repository cannot prove an external
DNS/TLS/ingress failure without the production URL/logs. The launch-path blockers
that can manifest as a reachable-but-nonfunctional site are AUD-C-01, AUD-H-02,
AUD-H-03, and AUD-H-12.

## Genuine strengths

- `security.py:22` uses constant-time token comparison; SQL values are parameterized.
- Pydantic and strict TypeScript limit core input shapes and lengths.
- Drafts start `pending`; agent runs record hashes, latency, model, and guardrail.
- No committed real API keys/private keys were found; env files are ignored.
- Backend tests and frontend static checks/build pass locally.
- UI has labels, ARIA state, focus styling, PWA metadata, and explicit human review.
- Docs clearly describe an intended target architecture, even where implementation
  is incomplete.

## Master issue list

| ID | Severity | One-line remediation |
|---|---|---|
| AUD-C-01 | Critical | Normalize DB path; file-backed API smoke |
| AUD-C-02 | Critical | Remove default token; fail closed |
| AUD-C-03 | Critical | Authenticate BFF; tenant/object scope |
| AUD-C-04 | Critical | Enforce approved LLM/PDPA boundary |
| AUD-H-01 | High | Principal, tenant, role, reviewer identity |
| AUD-H-02 | High | Production fail-closed, no mock 200 |
| AUD-H-03 | High | Use Compose service DNS for BFF |
| AUD-H-04 | High | Scope/expire/purge offline data |
| AUD-H-05 | High | Cache Next assets; cold offline test |
| AUD-H-06 | High | Backend-authoritative approval |
| AUD-H-07 | High | Block/quarantine guardrail failures |
| AUD-H-08 | High | Prompt-injection boundary + schema |
| AUD-H-09 | High | Retention/deletion/minimization |
| AUD-H-10 | High | Atomic scoped hash-bound idempotency |
| AUD-H-11 | High | Distributed quota/concurrency budget |
| AUD-H-12 | High | Readiness separate from liveness |
| AUD-H-13 | High | Require rubric; no production mock |
| AUD-H-14 | High | Enforced release preflight |
| AUD-M-01..16 | Medium | See medium table above |
| AUD-L-01..02 | Low | Fail placeholder URL; self-host fonts |

**Release gate:** resolve all Critical and High issues, then re-run security,
Compose, persisted-DB, and browser/offline verification before real student data.
