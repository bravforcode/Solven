# Solven Remediation — Execution Status

**Branch:** `audit/solven-full-audit-2026-08-13` · **Base:** `d6fb282` · **HEAD:** `8ac0826`
**Method:** subagent-driven development (implementer dispatches + two-stage reviews), TDD, evidence-only.

## Verified done (each reviewed by spec + quality subagents)

| Task | What landed | Evidence |
|---|---|---|
| T0-01 + AUD-M-03 | SQLite path normalized to Path; migrations on default/`:memory:`; persisted API smoke | `test_persisted_db.py`; 94 pytest |
| T0-02 + AUD-H-14 | `SOLVEN_ENV` dev/production; strong-token/CORS/LLM production gates; `python -m app.preflight` (exit codes verified); compose requires token | `test_config.py`, `test_preflight.py`; CLI exit 0/1 verified |
| T0-03 + AUD-H-02/13 | BFF fail-closed (502, no mock draft); demo-only mock (`NEXT_PUBLIC_SOLVEN_MODE=demo`); grading requires rubric (BFF 400 + backend 422 + UI guard) | `test_coordinator.py`; lint/typecheck/build |
| T0-06 + T1-01/02 + AUD-C-03/H-01 | Identity vertical slice: edge-injected `x-solven-principal` required in production (BFF + backend 401); drafts tenant-scoped; ownership 403; replay ownership (C1); BFF forwards verified principal (C2); tenant-scoped audit (I2); edge contract documented (I1); migration 002 | `test_tenant.py` (6 tests); re-review approved |
| T1-04 + AUD-H-03/12 | `SOLVEN_BACKEND_URL` runtime service DNS; `/readyz` (DB probe) vs `/health`; compose healthcheck on readyz | compose config rendered; `test_coordinator.py` |
| T0-04/05 + AUD-C-04 | Approved-provider allowlist production gate; PDPA redaction boundary before external calls (`app/redact.py`); mock path untouched | `test_redact.py`, `test_config.py` |
| T1-03 + AUD-H-06 | Backend-authoritative draft reads (BFF merges backend, strict teacherId filter, 502 on backend down in prod) | frontend build; backend scoping tests |
| T1-05/06 + AUD-H-04/05 | Offline queue: 7-day TTL, 500 max, expired purge (TS + SW); SW runtime cache `/_next/static/*` | frontend build; queue unit seams |
| T1-07/08 + AUD-H-07/08 | Real-provider guardrail failure → `quarantined` (mock exempt, demo-only); prompt-injection boundary (delimiters + instruction hierarchy); grading score schema check | `test_coordinator.py` (4 new) |
| T1-09/10 + AUD-H-09/10 | Retention purge at startup (`SOLVEN_RETENTION_DAYS=180` assumed), scoped DELETE, in-flight duplicate → 409, replay ownership 403 | `test_tenant.py` (3 new) |
| T2-02/03/09 + AUD-M-02/04/12 | Bounded pagination (limit clamp 1..500) drafts+audit; atomic `BEGIN IMMEDIATE` migrations with tracker transaction + comment stripping; JSON structured logging (keys match middleware) | `test_security.py`, `test_migrate.py`; 94 pytest |
| Docs | DEPLOYMENT.md: identity edge contract, dev-only compose note, preflight gate, offline-flush edge requirement; README checklist; .env.example (SOLVEN_ENV, APPROVED_LLM_PROVIDERS, RETENTION_DAYS, SOLVEN_MODE) | — |

**Regression:** backend `94 passed` · frontend lint/typecheck/build pass · no secrets committed · no file corruption (null-byte scan clean).

## Honest remaining (deferred with reasons, NOT claimed done)

| Item | Why deferred |
|---|---|
| T1-12 Next.js/PostCSS major upgrade | Fixes require `next@15.5.x+` (major). Would break App Router APIs (async params/headers) — needs its own tested branch + browser regression. Current advisories are DoS/SSRF classes not evidenced as reachable in this app (reviewer-verified reachability analysis). |
| T1-11 Redis/edge rate-limit + cost quotas | Requires Redis/edge infra decision; in-process limiter + fail-closed + retry caps remain; documented in DEPLOYMENT.md as multi-instance gate. |
| T2-07 dependency lock/hash + image pinning + SBOM | Requires build-infra work; npm audit now tracked in CI docs; requirements are lower-bounded (documented risk). |
| T2-11 DR backup/restore drills | Requires external storage decision + scheduled jobs; runbook documents RPO/RTO as required checklist. |
| T2-06 frontend behavioral tests (vitest/Playwright) | No frontend test infra existed; BFF behavior verified via backend tests + build + reviews. Queued as the next workstream. |
| T2-04 WAL/busy-timeout SQLite hardening | Pilot-scale acceptable; PostgreSQL gate documented before multi-instance. |
| T2-10 nonce CSP | Requires infra that supports nonces; current CSP keeps hydration working (unsafe-inline documented as required). |
| LearnDi adapter (ARCH-14) | No external contract exists — documented as discovery-first. |
| Minor: SW-flush token-only-edge limitation, purge of crash-orphaned tasks, inline-comment `--` in migrations, `handlers[0]` brittleness | Reviewed as Minor; tracked in this document. |

## Additional backend production-readiness batch (2026-08-14, commit f1af2f1)

| Item | What landed | Evidence |
|---|---|---|
| T2-04 SQLite WAL/busy_timeout | WAL + busy_timeout=5000 + connect timeout for file DBs | `test_file_db_uses_wal_and_busy_timeout` |
| DEV-06 migrate CLI | Real argparse: `python -m app.migrate --db <path>` (+ legacy positional + `:memory:`) — the documented `--db` flag previously did nothing | 3 CLI tests; live run on dev DB |
| T1-09 orphan purge | Crash-orphaned tasks (no draft, older than retention) now purged with their runs | `test_purge_removes_crash_orphaned_tasks` |
| SEC-L-02 | `/docs`, `/redoc`, `/openapi.json` disabled in production | prod 404 tests, dev 200 |
| SEC-L-01 | `x-request-id` validated (bounded `[A-Za-z0-9._:-]{1,64}`), else fresh id — no log injection | 2 tests |
| Logging brittleness | Root logger configured explicitly (no `handlers[0]` assumption) | suite green |
| T2-07 (partial) | `requirements.txt` exact-pinned to tested venv; backend Dockerfile runs as non-root `solven` user with `/data` ownership | `pip check` clean; **Docker runtime build NOT verified (no local engine)** |

Backend suite now **108 passed**.

## Assumptions made (user chose "everything incl. blocked" — flagged in code/docs)


1. Identity: production uses an edge-injected principal header (OIDC/session edge); verified-strip requirement documented; demo uses `demo-teacher`.
2. PDPA: retention 180 days (configurable); redaction patterns for synthetic/demo data — legal policy is owner decision.
3. LLM: production requires explicit approved-provider list + keys; external providers denied by default; Thai self-host remains target.
4. LearnDi: no runtime integration; interface seam only.

## Release gate status

- Critical (AUD-C-01..04 / SEC-C-01/02): **closed with tests**.
- High: 14/14 addressed (12 fully; T1-11/T1-12 partially → documented).
- Medium: 5/16 closed (T2-02/03/09 + AUD-M-01 via BFF guards + AUD-M-16 partially); remainder documented above.
- Low: AUD-L-01/02 documented; SEC-L-01/02 not yet (request-id validation, docs protection) — queued.
