# Solven — Implementation Plan

**Generated:** 2026-08-13 · **Based on:** `01_project_audit.md`,
`04_security_audit.md`, `07_architecture_review.md`, `08_testing_qa_audit.md`,
`09_devops_audit.md` · **Revision:** `d6fb282`

## Plan overview

| Measure | Value |
|---|---:|
| Canonical audit issues | 36 (4 Critical, 14 High, 16 Medium, 2 Low) |
| Planned tasks | 29 |
| Estimated engineering effort | ~260h, excluding external identity/PDPA decisions |
| Capacity assumption | Unknown; schedule below assumes one 40h/week stream + 20% buffer |
| Critical path | `TASK-0-01 → TASK-0-02 → TASK-0-03 → TASK-1-01 → TASK-1-02 → TASK-2-06` |
| Earliest safe state | After Phase 1 gate; no real student data before then |

## Planning constraints and decisions

- Current product is a pre-launch prototype; no production traffic/URL/team
  capacity was supplied. Estimates are engineering estimates, not commitments.
- Critical findings require human validation before broad refactors.
- Identity provider (OIDC/JWT/session), tenant key, retention period, approved LLM
  region/provider, and LearnDi contract are unresolved decisions. Tasks that depend
  on them are explicitly blocked rather than guessed.
- Synthetic data only in tests and audit environments. No real student records,
  credentials, or provider keys are permitted.
- Every task is ≤16h. Schema, auth, provider and infrastructure work has rollback.
- Phase gates are hard gates; later phases do not start on a failed gate.

## Phase 0 — Emergency triage

**Goal:** remove immediate public/data-loss paths and make the launch configuration
fail closed. **Gate:** all Critical findings have passing verification and no public
route can silently process real data in mock mode.

### TASK-0-01: Normalize effective SQLite path and add persisted API smoke

| Field | Value |
|---|---|
| Source audit issues | AUD-C-01, AUD-M-03; DEV-02 |
| Phase / priority / dimension | 0 / P0-Emergency / Data, DevOps |
| Effort / complexity / assignee | 4h / Low / Backend |
| Depends on / blocks | None / TASK-0-04, TASK-1-04, TASK-2-06 |
| Breaking-change risk | Low |

**Objective:** Convert the configured path to one `Path` value used by Store and
migrations; prove file-backed create/list/patch/audit behavior.

**Steps:**
1. Add one path resolver at the composition root; preserve `:memory:` test mode.
2. Pass the resolved value to both `Store` and migration startup.
3. Add a temporary-file API test covering schema creation and all protected routes.
4. Run the test against `/data/solven.db` semantics without touching host data.

**Acceptance criteria:**
- [ ] `Store(Path(...))._c()` and app startup work for a file-backed DB.
- [ ] Temporary-file create/list/patch/audit test passes.
- [ ] Existing backend suite remains green: `python -m pytest -q`.

**Rollback:** Revert the resolver/test commit; keep deployment blocked if the
persisted smoke fails.

**Verification:** `python -m pytest -q backend/tests` plus the new file-backed test.

### TASK-0-02: Enforce production secret and release preflight

| Field | Value |
|---|---|
| Source audit issues | AUD-C-02, AUD-H-14; SEC-C-02; DEV-03 |
| Phase / priority / dimension | 0 / P0-Emergency / Security, DevOps |
| Effort / complexity / assignee | 6h / Low / Backend + DevOps |
| Depends on / blocks | None / TASK-0-03, TASK-1-04 |
| Breaking-change risk | Medium |

**Objective:** Ensure release startup rejects missing, weak, known-default token,
placeholder URL, unsafe CORS and demo-only LLM mode.

**Steps:**
1. Add explicit production/demo mode to configuration.
2. Reject the known token and enforce length/entropy in production mode.
3. Add `scripts/release_preflight` (or equivalent existing CI command) with redacted
   effective config output.
4. Replace Compose fallback with required secret injection.

**Acceptance criteria:**
- [ ] Production preflight fails for missing, default or short token.
- [ ] Compose config cannot render `dev-secret-change-me` in release mode.
- [ ] Preflight rejects placeholder site URL, localhost CORS and mock LLM.
- [ ] Dev/demo fixture remains explicit and documented.

**Rollback:** Revert release-gate changes and keep public deployment disabled; do
not restore a production default secret.

**Verification:** preflight negative matrix + `docker compose config` with synthetic
secret; no secret value in logs/artifacts.

### TASK-0-03: Fail closed on backend errors and prohibit production mock grading

| Field | Value |
|---|---|
| Source audit issues | AUD-H-02, AUD-H-13; ARCH-04; SEC-M-04 |
| Phase / priority / dimension | 0 / P0-Emergency / API, AI safety |
| Effort / complexity / assignee | 4h / Low / Full-stack |
| Depends on / blocks | TASK-0-02 / TASK-1-07, TASK-2-06 |
| Breaking-change risk | Medium |

**Objective:** Backend 401/4xx/5xx/timeout must be visible failure in production;
mock output must be explicit demo-only; grading requires a non-empty rubric.

**Steps:**
1. Add runtime mode gate around `runAgent()` fallback.
2. Preserve backend status/error class through the BFF response.
3. Reject grading requests without a rubric at the authoritative boundary.
4. Label demo output and add negative tests.

**Acceptance criteria:**
- [ ] Production backend failure returns non-2xx and creates no mock draft.
- [ ] Demo mode is the only mode that can return local mock output.
- [ ] Grading without rubric returns validation failure in both BFF/backend paths.
- [ ] Existing success path and backend tests pass.

**Rollback:** Revert mode gate only in an isolated demo branch; never re-enable
fallback for a public/production environment.

**Verification:** mocked backend 401/500/timeout tests + `pytest` + frontend build.

### TASK-0-04: Deny unapproved external LLM providers in production

| Field | Value |
|---|---|
| Source audit issues | AUD-C-04; SEC-H-03; ARCH-06 |
| Phase / priority / dimension | 0 / P0-Emergency / Security, Compliance |
| Effort / complexity / assignee | 4h / Medium / Backend + Compliance |
| Depends on / blocks | Provider policy decision / TASK-0-05 |
| Breaking-change risk | High |

**Objective:** No provider key can silently move student content outside the
approved boundary. This task is blocked until the approved provider/region list is
confirmed by the product owner.

**Steps:**
1. Add explicit provider mode and approved endpoint allowlist.
2. Reject external provider selection in production when policy is unset.
3. Record provider policy/version in audit metadata.
4. Add synthetic startup and routing tests.

**Acceptance criteria:**
- [ ] Production startup fails closed when provider policy is missing/unsafe.
- [ ] No automatic key-presence provider selection remains in production mode.
- [ ] Synthetic provider policy test records selected provider and policy version.

**Rollback:** Keep production provider disabled; revert only the config plumbing,
not the fail-closed behavior.

**Verification:** policy matrix tests with fake endpoints and no real keys.

### TASK-0-05: Add synthetic PDPA redaction and provider egress test

| Field | Value |
|---|---|
| Source audit issues | AUD-C-04; SEC-H-03; AUD-H-09 |
| Phase / priority / dimension | 0 / P0-Emergency / Compliance, AI |
| Effort / complexity / assignee | 8h / Medium / Backend + Compliance |
| Depends on / blocks | TASK-0-04 / TASK-1-07, TASK-1-09 |
| Breaking-change risk | High |

**Objective:** Establish a tested boundary that removes configured synthetic PII
markers before any approved external inference call and records consent/policy
metadata. Actual legal retention/provider decisions remain owner-approved inputs.

**Steps:**
1. Define a redaction result with original never persisted in provider payload.
2. Apply it before provider invocation and preserve provenance internally.
3. Mock the HTTP transport and assert payload redaction/no raw identifiers.
4. Add failure behavior for redaction/policy uncertainty.

**Acceptance criteria:**
- [ ] Provider mock never receives synthetic student identifiers.
- [ ] Redaction/policy failure blocks the task rather than warning-only.
- [ ] Tests cover input, rubric and generated-output boundary cases.

**Rollback:** Disable external inference and route to approved local/mock demo only;
do not bypass the redaction test.

**Verification:** isolated provider transport test suite; inspect payload assertions.

### TASK-0-06: Close unauthenticated BFF routes by default

| Field | Value |
|---|---|
| Source audit issues | AUD-C-03; SEC-C-01; ARCH-03 |
| Phase / priority / dimension | 0 / P0-Emergency / Security |
| Effort / complexity / assignee | 8h / Medium / Full-stack |
| Depends on | TASK-0-02 / TASK-1-01, TASK-1-02 |
| Breaking-change risk | High |

**Objective:** Until the approved identity contract is implemented, production BFF
routes must deny requests rather than expose the privileged service token. Local
demo mode may remain explicitly enabled.

**Steps:**
1. Add a production BFF auth mode that returns 401 when no verified principal exists.
2. Ensure the service token is never accepted from browser input.
3. Add route tests for GET/POST/PATCH unauthenticated access.
4. Keep local demo mode visibly labeled and isolated from release preflight.

**Acceptance criteria:**
- [ ] Production BFF GET/POST/PATCH return 401/403 without verified identity.
- [ ] Browser bundle contains no backend service token.
- [ ] Demo mode cannot be selected by an untrusted request field.

**Rollback:** Keep public mode closed; revert only local demo wiring if it blocks
development.

**Verification:** route tests and production build inspection for token absence.

## Phase 1 — Foundation hardening

**Goal:** make the system safe for a controlled synthetic pilot. **Gate:** all High
findings pass security/QA review; no unscoped data route, unsafe provider path,
default secret, broken Compose path, or warning-only unsafe output remains.

### TASK-1-01: Define identity, tenant, role, and reviewer contracts

| Field | Value |
|---|---|
| Source audit issues | AUD-H-01; ARCH-03; SEC-H-01 |
| Phase / priority / dimension | 1 / P1-Critical / Security, Data |
| Effort / complexity / assignee | 16h / High / Pair Recommended |
| Depends on / blocks | Identity-provider decision, TASK-0-06 / TASK-1-02, TASK-1-03 |
| Breaking-change risk | High |

**Objective:** Define and implement the first authenticated principal/tenant
vertical slice without guessing the provider. Contract must include subject, school,
teacher, roles, reviewer identity and tenant key.

**Steps:**
1. Record provider claim mapping and trust boundary.
2. Add typed principal dependency and tenant-aware request context.
3. Add schema fields/migration for actor/tenant/provenance.
4. Add synthetic two-principal isolation fixtures.

**Acceptance criteria:**
- [ ] Principal contract is documented and validated at the backend boundary.
- [ ] Every protected route receives a tenant/principal context.
- [ ] Synthetic identities cannot read each other’s records.
- [ ] Migration is additive and reversible via backup/forward rollback procedure.

**Rollback:** Disable pilot identity flag and keep BFF closed; restore DB from the
pre-migration backup if schema deployment fails.

**Verification:** auth contract tests, migration test, two-tenant isolation suite.

### TASK-1-02: Enforce tenant-scoped BFF routes and backend queries

| Field | Value |
|---|---|
| Source audit issues | AUD-C-03, AUD-H-01; SEC-C-01, SEC-H-01 |
| Phase / priority / dimension | 1 / P1-Critical / Security, API |
| Effort / complexity / assignee | 16h / High / Pair Recommended |
| Depends on | TASK-1-01 / TASK-1-03, TASK-2-02 |
| Breaking-change risk | High |

**Objective:** Apply verified identity and tenant/object authorization to all Next
BFF and FastAPI data routes.

**Steps:**
1. Verify session/JWT at each BFF route; derive, never accept, principal fields.
2. Pass scoped actor context to backend service calls.
3. Add `WHERE tenant_id/owner` predicates and role checks to list/patch/audit.
4. Return uniform 401/403 without revealing record existence.

**Acceptance criteria:**
- [ ] Unauthenticated requests fail on every BFF/backend protected route.
- [ ] Cross-tenant list/get/patch/audit attempts return 403/404 as designed.
- [ ] Reviewer actor is persisted for approval/rejection.
- [ ] Security regression suite passes in CI.

**Rollback:** Disable pilot route flag and restore prior DB snapshot; keep production
routes deny-by-default if rollback removes authorization.

**Verification:** two-principal route matrix with synthetic records.

### TASK-1-03: Make backend authoritative for drafts and approval events

| Field | Value |
|---|---|
| Source audit issues | AUD-H-06, AUD-H-01; ARCH-05, ARCH-10 |
| Phase / priority / dimension | 1 / P1-Critical / Data integrity |
| Effort / complexity / assignee | 8h / Medium / Backend + Frontend |
| Depends on | TASK-1-01, TASK-1-02 / TASK-2-12 |
| Breaking-change risk | Medium |

**Objective:** Remove process-local draft authority from production behavior and
record approval/rejection as an authenticated event.

**Steps:**
1. Read BFF draft lists from backend authoritative storage.
2. PATCH backend first; update UI only after success.
3. Persist actor, timestamp, previous/new status and request ID.
4. Return explicit conflict/error without optimistic false success.

**Acceptance criteria:**
- [ ] Restarting Next does not lose or invent a backend draft.
- [ ] Failed backend PATCH leaves UI status unchanged and returns non-2xx.
- [ ] Approval event contains actor and immutable transition data.

**Rollback:** Revert BFF read path while keeping backend events; restore from DB
backup if event migration fails.

**Verification:** restart/mirror failure integration tests.

### TASK-1-04: Fix Compose service DNS and readiness checks

| Field | Value |
|---|---|
| Source audit issues | AUD-H-03, AUD-H-12; DEV-01, DEV-02, DEV-06 |
| Phase / priority / dimension | 1 / P1-Critical / DevOps |
| Effort / complexity / assignee | 8h / Medium / DevOps |
| Depends on | TASK-0-01, TASK-0-02 / TASK-2-06 |
| Breaking-change risk | Medium |

**Objective:** Make container-to-container calls use service DNS and make readiness
prove the actual persisted API path.

**Steps:**
1. Replace BFF server URL with `backend:8000`; remove public backend port by default.
2. Split `/live` from `/readyz`; readiness opens DB/schema and checks migrations.
3. Update Compose dependency/healthcheck and runbook.
4. Add synthetic Compose smoke job (runtime-enabled CI).

**Acceptance criteria:**
- [ ] Frontend container reaches backend at `http://backend:8000`.
- [ ] `/readyz` fails for unusable DB and passes after migration.
- [ ] Synthetic coordinator request returns `engine=backend` and persists.
- [ ] Backend is not publicly published in the default production Compose profile.

**Rollback:** Restore prior Compose only in local demo profile; production remains
closed if readiness cannot be proven.

**Verification:** `docker compose config` + runtime smoke on a Linux engine.

### TASK-1-05: Scope, expire, minimize, and purge offline data

| Field | Value |
|---|---|
| Source audit issues | AUD-H-04; SEC-M-05; AUD-M-16 |
| Phase / priority / dimension | 1 / P1-Critical / Compliance, Offline |
| Effort / complexity / assignee | 8h / Medium / Frontend + Compliance |
| Depends on | TASK-1-01 / TASK-1-06 |
| Breaking-change risk | Medium |

**Objective:** Prevent indefinite plaintext student content in browser storage.

**Steps:**
1. Add queue owner/device scope, max count/bytes and expiry metadata.
2. Add logout/clear-data/purge-expired operations and visible status.
3. Store only minimum required fields; disable sensitive offline mode when policy
   requires it.
4. Feature-detect IndexedDB and preserve form data on failure.

**Acceptance criteria:**
- [ ] Expired/cleared records are deleted and cannot replay.
- [ ] Queue rejects over-limit records with an actionable UI error.
- [ ] Storage-disabled/private-mode path does not silently lose input.
- [ ] Synthetic shared-device lifecycle test passes.

**Rollback:** Disable offline queue via feature flag; retain server path.

**Verification:** browser storage lifecycle tests.

### TASK-1-06: Unify service-worker asset caching and offline replay

| Field | Value |
|---|---|
| Source audit issues | AUD-H-05; ARCH-12 |
| Phase / priority / dimension | 1 / P1-Critical / PWA, Testing |
| Effort / complexity / assignee | 8h / Medium / Frontend |
| Depends on | TASK-1-05 / TASK-2-06 |
| Breaking-change risk | Medium |

**Objective:** Make cold offline reload usable and eliminate queue schema/behavior
   drift between page code and service worker.

**Steps:**
1. Version one queue schema/protocol and designate one replay implementation.
2. Precache or runtime-cache immutable Next assets and an offline fallback.
3. Preserve idempotency/conflict outcomes rather than deleting on any 2xx.
4. Add browser cold-reload/reconnect test.

**Acceptance criteria:**
- [ ] Cold offline reload has JS/CSS and visible queue state.
- [ ] Page and service worker use the same schema version and replay semantics.
- [ ] Failed/conflict replay remains inspectable and retryable.

**Rollback:** Revert service-worker cache version and unregister old worker in a
controlled release; keep server queue disabled if replay is unsafe.

**Verification:** Playwright offline/reconnect test.

### TASK-1-07: Make guardrail and PII failures blocking/quarantined

| Field | Value |
|---|---|
| Source audit issues | AUD-H-07; SEC-H-04; ARCH-07 |
| Phase / priority / dimension | 1 / P1-Critical / AI safety |
| Effort / complexity / assignee | 8h / Medium / Backend + QA |
| Depends on | TASK-0-05 / TASK-2-06 |
| Breaking-change risk | Medium |

**Objective:** Failed policy checks cannot be returned as ordinary pending drafts.

**Steps:**
1. Expand tested Thai/international PII detectors and policy version.
2. Add `quarantined`/blocked state and prevent normal DraftOut/export.
3. Redact or route to manual escalation with audit event.
4. Add synthetic failure and retry-exhaustion tests.

**Acceptance criteria:**
- [ ] Failed guardrail output is never returned as normal `pending`.
- [ ] PII canary cases are blocked/redacted across supported formats.
- [ ] Quarantine reason/policy version is auditable without storing unnecessary PII.

**Rollback:** Disable provider path and quarantine all affected tasks; do not revert
to warning-only behavior for production.

**Verification:** backend guardrail/security regression suite.

### TASK-1-08: Isolate untrusted prompts and validate structured model output

| Field | Value |
|---|---|
| Source audit issues | AUD-H-08; SEC-M-01 |
| Phase / priority / dimension | 1 / P1-Critical / AI security |
| Effort / complexity / assignee | 8h / Medium / Backend + QA |
| Depends on | TASK-0-05, TASK-1-07 / TASK-2-06 |
| Breaking-change risk | Medium |

**Objective:** Student/rubric text is data, not instruction, and model output is
   schema-validated before persistence/review.

**Steps:**
1. Use explicit trusted-instruction/untrusted-data delimiters.
2. Define typed output schema per agent and reject malformed output.
3. Validate score/rubric linkage and preserve provenance.
4. Add injection canaries and output-boundary tests.

**Acceptance criteria:**
- [ ] Injection canaries cannot override rubric/system constraints in tests.
- [ ] Malformed/out-of-range output is quarantined, not persisted as normal draft.
- [ ] Provenance identifies input/rubric/model/policy versions.

**Rollback:** Disable affected agent/provider and keep draft creation quarantined.

**Verification:** deterministic mock and adversarial synthetic test suite.

### TASK-1-09: Implement retention, deletion, and student-data minimization

| Field | Value |
|---|---|
| Source audit issues | AUD-H-09; ARCH-15, AUD-M-14 |
| Phase / priority / dimension | 1 / P1-Critical / Data, PDPA |
| Effort / complexity / assignee | 12h / High / Backend + Compliance |
| Depends on | Retention/consent decision, TASK-1-01 / TASK-2-11 |
| Breaking-change risk | High |

**Objective:** Apply an approved lifecycle policy to raw input/output, queue data,
   backups and audit metadata.

**Steps:**
1. Add retention class/expiry/consent/tenant fields and deletion service.
2. Add authenticated scoped deletion and scheduled purge.
3. Exclude/minimize raw content in audit records and exports.
4. Add backup-expiry and deletion verification tests.

**Acceptance criteria:**
- [ ] Expired records are purged on schedule and cannot be listed/replayed.
- [ ] Authorized subject/tenant deletion removes all defined copies.
- [ ] Backup retention and restore behavior are documented and tested.

**Rollback:** Take backup before migration; pause purge job and restore from verified
backup if deletion logic is wrong. Never recreate deleted production data.

**Verification:** synthetic end-to-end lifecycle test + restore drill.

### TASK-1-10: Make idempotency atomic, scoped, and hash-bound

| Field | Value |
|---|---|
| Source audit issues | AUD-H-10; ARCH-08 |
| Phase / priority / dimension | 1 / P1-Critical / API, Concurrency |
| Effort / complexity / assignee | 8h / Medium / Backend |
| Depends on | TASK-1-01 / TASK-2-06 |
| Breaking-change risk | Medium |

**Objective:** Offline retries cannot duplicate work or reuse a key for different
   payloads.

**Steps:**
1. Add scoped idempotency table/unique constraint and canonical request digest.
2. Atomically claim pending key before LLM execution.
3. Return same result for matching replay; conflict for digest mismatch.
4. Add concurrent replay test with synthetic payloads.

**Acceptance criteria:**
- [ ] Matching concurrent retries create one task/draft/run result.
- [ ] Same key with changed payload returns conflict and does no work.
- [ ] Idempotency scope includes authenticated tenant/principal.

**Rollback:** Disable offline replay and use manual retry while preserving idempotency
records; restore DB backup if migration fails.

**Verification:** concurrent backend test and persisted SQLite test.

### TASK-1-11: Add provider concurrency, quota, and cost budgets

| Field | Value |
|---|---|
| Source audit issues | AUD-H-11, AUD-H-02; SEC-H-05, SEC-M-02 |
| Phase / priority / dimension | 1 / P1-Critical / Security, Performance |
| Effort / complexity / assignee | 8h / Medium / Backend + DevOps |
| Depends on | TASK-1-01, TASK-0-03 / TASK-2-05 |
| Breaking-change risk | Medium |

**Objective:** Bound abuse and LLM spend across workers/instances.

**Steps:**
1. Define per-principal/IP/global request and batch limits.
2. Add in-flight semaphore and provider timeout/retry budget.
3. Add Redis/edge adapter seam; retain bounded local fallback only for single demo.
4. Emit 429/Retry-After and budget audit events.

**Acceptance criteria:**
- [ ] Oversized/burst/concurrent synthetic workload is bounded.
- [ ] One request cannot exceed configured model-call/cost budget.
- [ ] Multi-instance strategy and trusted proxy behavior are documented/tested.

**Rollback:** Disable external provider and reduce limits; do not remove abuse
controls in a public environment.

**Verification:** deterministic quota/concurrency tests.

### TASK-1-12: Upgrade Next.js/PostCSS on a tested compatibility branch

| Field | Value |
|---|---|
| Source audit issues | SEC-H-06; AUD-M-09 |
| Phase / priority / dimension | 1 / P1-Critical / Dependencies |
| Effort / complexity / assignee | 8h / Medium / Frontend |
| Depends on | None / TASK-2-06 |
| Breaking-change risk | Medium |

**Objective:** Remove reachable high advisories without blind major-version
   replacement or loss of the CSP/hydration fix.

**Steps:**
1. Select supported patched Next version compatible with project runtime.
2. Update lockfile and test App Router/CSP/RSC/offline behavior.
3. Run production-only/full audits and inspect transitive changes.
4. Document any accepted non-runtime advisory with reachability evidence.

**Acceptance criteria:**
- [ ] Production audit has zero unreviewed high findings.
- [ ] Lint/typecheck/build and hydration smoke pass.
- [ ] Offline queue and service-worker tests pass after upgrade.

**Rollback:** Revert package/lockfile commit and keep release blocked on advisories.

**Verification:** npm audit commands + frontend checks + browser smoke.

### TASK-1-13: Enforce TLS-only edge and private backend exposure

| Field | Value |
|---|---|
| Source audit issues | SEC-H-02 |
| Phase / priority / dimension | 1 / P1-Critical / Security, DevOps |
| Effort / complexity / assignee | 8h / Medium / DevOps |
| Depends on | TASK-0-02, TASK-1-04 / TASK-2-10 |
| Breaking-change risk | High |

**Objective:** Protect bearer/data traffic and prevent direct backend exposure.

**Steps:**
1. Define TLS termination/redirect and trusted proxy contract.
2. Remove direct backend public port from production profile.
3. Add HSTS only after HTTPS edge verification; set no-store on sensitive APIs.
4. Add external synthetic HTTPS/header smoke.

**Acceptance criteria:**
- [ ] HTTP is redirected/blocked and backend port is not public.
- [ ] TLS endpoint presents valid certificate and HSTS after validation.
- [ ] Sensitive responses include appropriate no-store policy.

**Rollback:** Revert edge config to prior known-good TLS artifact; never expose the
backend with the default token.

**Verification:** `curl -I` HTTPS/HTTP and edge configuration check.

## Phase 2 — Core quality uplift

**Goal:** make current-scale operation bounded, observable, reproducible and tested.
**Gate:** persisted/Compose/browser/security regression suite passes; no open high
dependency or launch-path defect.

| Task | Deliverable | Issues | Effort |
|---|---|---|---:|
| TASK-2-01 | Runtime BFF schemas, body limits, strict unknown-field rejection | AUD-M-01, QA-06 | 4h |
| TASK-2-02 | `/api/v1` pagination, limits, response projection | AUD-M-02, ARCH-09 | 8h |
| TASK-2-03 | Locked, transactional, correctly parsed migrations | AUD-M-04, DEV-06 | 6h |
| TASK-2-04 | SQLite WAL/busy timeout and PostgreSQL migration gate | AUD-M-05, ARCH-09 | 8h |
| TASK-2-05 | Cached graph/provider client, bounded batch, typed provider errors | AUD-M-06, AUD-M-07 | 8h |
| TASK-2-06 | Frontend, persisted DB, Compose, browser, auth and AI regression suite | AUD-M-08, QA-01..06 | 16h |
| TASK-2-07 | Locked/hash-pinned dependencies, non-root images, image/SBOM scans | AUD-M-09, AUD-M-10, DEV-04/05 | 12h |
| TASK-2-08 | One effective environment/secret injection contract and runbook | AUD-M-11, DEV-09 | 4h |
| TASK-2-09 | Emitted JSON logs, metrics, alerts and request correlation | AUD-M-12, DEV-07 | 8h |
| TASK-2-10 | CSP nonce investigation/upgrade, strict CORS, security headers | AUD-M-13, SEC-M-09 | 8h |
| TASK-2-11 | Encrypted backup, restore drill, RPO/RTO and retention alignment | AUD-M-14, DEV-08/10 | 12h |
| TASK-2-12 | Authorized, redacted, auditable export/copy path | AUD-M-15, SEC-M-12 | 6h |
| TASK-2-13 | IndexedDB capability/error UX and queue diagnostics | AUD-M-16 | 4h |
| TASK-2-14 | Full provenance hashes, prompt/model/policy/token metadata | ARCH-10, SEC-M-08 | 8h |
| TASK-2-15 | Shared/versioned API contract and removal of duplicate mocks | ARCH-11 | 6h |

Each Phase 2 task requires: (1) at least three behavior assertions, (2) existing
backend/frontend checks pass, and (3) a rollback note in the task PR. Tasks 2-01,
2-02, 2-03, 2-05, 2-06 and 2-09 depend on TASK-1-01 through TASK-1-04; tasks
2-07/2-08/2-11 depend on TASK-0-02 and TASK-1-04.

## Phase 3 — Systematic improvement

**Goal:** remove remaining release ambiguity and establish maintainable operations.

| Task | Deliverable | Issues | Effort |
|---|---|---|---:|
| TASK-3-01 | Fail production build on placeholder canonical/site URL | AUD-L-01 | 1h |
| TASK-3-02 | Self-host fonts or explicit build-network preflight | AUD-L-02 | 1h |
| TASK-3-03 | Correct prototype/production claims and operator onboarding | SEC-M-13 | 6h |
| TASK-3-04 | Coverage trend, flaky-test policy and quarterly QA review | QA-05, AUD-M-08 | 6h |
| TASK-3-05 | LearnDi contract discovery: identity, SSO, events, IDs, residency | ARCH-14 | 8h |
| TASK-3-06 | Request-ID validation and protected docs/minimal health metadata | SEC-L-01, SEC-L-02 | 4h |

**Gate:** no placeholder/contradictory launch documentation; LearnDi contract is
written and approved before adapter implementation.

## Phase 4 — Optimization and excellence

| Task | Deliverable | Issues | Effort |
|---|---|---|---:|
| TASK-4-01 | Durable worker/checkpoint/recovery for long LLM jobs | ARCH-08 | 16h |
| TASK-4-02 | PostgreSQL/Redis multi-instance pilot migration and load test | AUD-M-05, ARCH-09 | 16h |
| TASK-4-03 | LearnDi anti-corruption adapter and approval-gated writeback | ARCH-14 | 16h |
| TASK-4-04 | Capacity/load/latency budget and cost dashboard | AUD-M-06, AUD-H-11 | 8h |

These tasks require approved external contracts and are not safe to guess during
the current audit session.

## Phase 5 — Continuous maintenance systems

- Weekly dependency/CVE and secret scan with release blocking for Critical/High.
- Per-release `release_preflight`, persisted DB/Compose/browser smoke and rollback
  checklist.
- Monthly restore drill and quarterly retention/deletion verification.
- Quarterly threat model, prompt-injection corpus refresh and tenant-isolation test.
- Review DORA metrics, p95/p99 latency, model cost, guardrail quarantine and queue
  age; feed failures back to the issue list.

## Audit issue coverage

| Audit issue | Task(s) |
|---|---|
| AUD-C-01 | TASK-0-01 |
| AUD-C-02 | TASK-0-02 |
| AUD-C-03 | TASK-0-06, TASK-1-02 |
| AUD-C-04 | TASK-0-04, TASK-0-05 |
| AUD-H-01 | TASK-1-01, TASK-1-02, TASK-1-03 |
| AUD-H-02 | TASK-0-03, TASK-1-11 |
| AUD-H-03 | TASK-1-04 |
| AUD-H-04 | TASK-1-05 |
| AUD-H-05 | TASK-1-06 |
| AUD-H-06 | TASK-1-03 |
| AUD-H-07 | TASK-1-07 |
| AUD-H-08 | TASK-1-08 |
| AUD-H-09 | TASK-1-09 |
| AUD-H-10 | TASK-1-10 |
| AUD-H-11 | TASK-1-11, TASK-4-04 |
| AUD-H-12 | TASK-1-04 |
| AUD-H-13 | TASK-0-03 |
| AUD-H-14 | TASK-0-02 |
| AUD-M-01 | TASK-2-01 |
| AUD-M-02 | TASK-2-02 |
| AUD-M-03 | TASK-0-01 |
| AUD-M-04 | TASK-2-03 |
| AUD-M-05 | TASK-2-04, TASK-4-02 |
| AUD-M-06 | TASK-2-05, TASK-4-04 |
| AUD-M-07 | TASK-2-05 |
| AUD-M-08 | TASK-2-06, TASK-3-04 |
| AUD-M-09 | TASK-1-12, TASK-2-07 |
| AUD-M-10 | TASK-2-07 |
| AUD-M-11 | TASK-2-08 |
| AUD-M-12 | TASK-2-09 |
| AUD-M-13 | TASK-2-10 |
| AUD-M-14 | TASK-1-09, TASK-2-11 |
| AUD-M-15 | TASK-2-12 |
| AUD-M-16 | TASK-1-05, TASK-2-13 |
| AUD-L-01 | TASK-3-01 |
| AUD-L-02 | TASK-3-02 |

## Success metrics

| Metric | Target | Measurement |
|---|---|---|
| Critical findings | 0 | Re-run PROMPT 01/04 |
| High findings | 0 before pilot | Master issue list |
| Default token acceptance | 0 | Release preflight test |
| Unauthenticated protected routes | 0 successful | Route matrix |
| Cross-tenant access | 0 successful | Two-principal suite |
| Persisted API smoke | 100% pass | File-backed/Compose test |
| Mock fallback in production | 0 | Negative integration test |
| Raw provider PII egress | 0 | Mock transport assertions |
| Guardrail-failed normal drafts | 0 | Quarantine test |
| Offline expired records | 0 replayable | Browser lifecycle test |
| npm high findings | 0 unreviewed | `npm audit --omit=dev` |
| Readiness false positives | 0 | DB failure readiness test |
| Restore success | 100% scheduled drills | Restore report |

## Stakeholder summary

The audit found a strong demonstrable prototype, but not a safe public service. The
most urgent problems are not visual: an unauthenticated proxy, known default
credential, broken persisted Compose path, mock-success fallback, and unbounded
student-data retention/egress. These can create silent false confidence even while
local tests and the page build pass.

Phase 0 closes the immediate exposure and makes unsafe configuration fail closed.
Phase 1 adds identity, tenant ownership, data lifecycle, AI safety and a working
launch path. Phase 2 adds the tests, dependency controls, observability and DR that
turn a pilot into an operable system. LearnDi and multi-instance scaling are
deliberately deferred until their external contracts are confirmed.

The business outcome is a controlled pilot where teachers can use Solven without
cross-school data access, silent mock grading, untracked approval, or unbounded
student-data persistence. Until the Phase 1 gate passes, use synthetic demo data
only.
