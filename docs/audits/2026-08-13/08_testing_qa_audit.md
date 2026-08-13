# Solven — Testing & QA Audit

**Auditor:** QA-ARCHITECT · **Date:** 2026-08-13 · **Revision:** `d6fb282`

## Current confidence

| Layer | Evidence | Status |
|---|---|---|
| Backend unit/integration subset | `python -m pytest -q` → 32 passed, 1 warning | Pass, narrow |
| Frontend lint | `npm run lint` | Pass |
| Frontend types | `npm run typecheck` | Pass |
| Frontend production build | `npm run build` | Pass |
| Frontend behavioral tests | No test script/files in `frontend/package.json:5-10` | Missing |
| Persisted SQLite path | No file-backed API test | Missing; known failure |
| Compose runtime | Config parses; Docker engine unavailable | Blocked |
| Browser/offline E2E | No Playwright/browser gate | Missing |
| Dependency gate | 2 production / 5 full npm high advisories | Blocked |

## Findings

### QA-01 — Medium: no frontend behavioral tests

- **Evidence:** `frontend/package.json:5-10`; no frontend test files.
- **Gap:** BFF auth/fallback, drafts list/PATCH, approval mirror, IndexedDB,
  service-worker replay, hydration, PWA/offline reload and export are untested.
- **Impact:** Static checks can pass while the user-visible critical path fails.
- **Verification:** Add route tests plus Playwright smoke for submit → review →
  approve, offline enqueue → reload → reconnect flush, and backend error display.

### QA-02 — Medium: audit test can false-pass

- **Evidence:** `backend/tests/test_coordinator.py:102-113`; second POST at
  `104-106` omits auth while assertion only checks `len(runs) >= 2`.
- **Impact:** A 401 can satisfy the run-count assertion because retries already
  produce multiple records (`backend/app/coordinator.py:87-90`).
- **Verification:** Assert both response status and exact task/run identity; test
  auth propagation separately.

### QA-03 — High: production paths masked by mocks/in-memory DB

- **Evidence:** `test_coordinator.py:18-25` and `test_migrate.py:10-15` use
  `:memory:`; no file-backed, provider-failure, Docker or replay test exists.
- **Impact:** The confirmed `/data/solven.db` type failure, migration startup,
  provider timeout, idempotency race and Compose DNS defects escape CI.
- **Verification:** Add temporary-file API smoke, migration subprocess, mocked
  provider failure/timeout, concurrent same-key replay and Compose integration job.

### QA-04 — High: insecure default is positively accepted by tests

- **Evidence:** `backend/tests/test_config.py:8-12` checks only non-empty token;
  default is `backend/app/config.py:27-29`.
- **Impact:** CI treats a known credential as valid configuration.
- **Verification:** Add production-mode config tests for missing, default, short
  and low-entropy tokens; retain explicit dev-only fixture.

### QA-05 — Medium: no coverage/quality threshold

- **Evidence:** `.github/workflows/ci.yml:9-46` runs tests but no coverage command;
  no branch threshold or report artifact exists.
- **Impact:** 32 passing tests do not quantify critical-path confidence.
- **Verification:** Add coverage for backend package and enforce a threshold for
  security/data paths; supplement with behavioral tests rather than chasing a
  single percentage.

### QA-06 — High: no negative/security/AI regression suite

- **Evidence:** no tests for BFF unauthenticated access, tenant isolation,
  guardrail quarantine, prompt injection, provider egress/redaction, output schema,
  body limits or production mock prohibition.
- **Impact:** The primary release blockers can regress silently.
- **Verification:** Add synthetic-only tests that prove 401/403, no raw provider
  egress, blocked PII output, schema rejection and fail-closed backend errors.

## Recommended test matrix

| Area | Required test | Gate |
|---|---|---|
| Config | Production env preflight rejects default/weak/placeholder values | Phase 0 |
| Persistence | File-backed temporary SQLite create/list/patch/audit/migrate | Phase 0 |
| Auth | BFF + backend unauthenticated/tenant/object/reviewer cases | Phase 0/1 |
| Failure | Backend 401/422/500/timeout never becomes mock success in prod | Phase 0/1 |
| AI safety | Injection, structured output, PII quarantine/provider redaction | Phase 0/1 |
| Offline | Cold reload, queue TTL/purge, replay idempotency/conflict | Phase 1/2 |
| Compose | service DNS, health/readiness, API request, migration | Phase 1 |
| Dependencies | npm/pip audit and lock reproducibility | Phase 1 |
| UI | submit/review/approve/export/accessibility smoke | Phase 2 |
| DR | backup/restore and retention expiry | Phase 3 |

## QA phase gates

1. **Static gate:** backend 32+ tests, frontend lint/typecheck/build, no new
   warnings treated as errors.
2. **Safety gate:** all Critical/High auth, token, persistence, fallback and AI
   tests pass with synthetic data only.
3. **Launch-path gate:** file-backed Compose + readiness + browser E2E pass in CI.
4. **Pilot gate:** tenant isolation, retention/delete, provider boundary and
   offline lifecycle verified with a disposable pilot environment.
