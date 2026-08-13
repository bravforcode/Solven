# Solven — DevOps / CI/CD Audit

**Auditor:** DEVOPS-SENTINEL · **Date:** 2026-08-13 · **Revision:** `d6fb282`

## Evidence snapshot

- Backend tests: **32 passed**, one deprecation warning.
- Frontend lint/typecheck/build: pass.
- `docker compose config`: pass and renders the known default token, mock mode,
  `/data/solven.db`, and frontend `localhost:8000`.
- Docker Desktop Linux engine: unavailable (`dockerDesktopLinuxEngine` pipe missing),
  so build/runtime smoke is not claimed.
- `npm audit`: 5 high full tree / 2 high production-only.
- Ruflo security/coverage CLI attempts exceeded 180s; no result inferred.
- No production DNS/TLS/ingress/log/backup evidence supplied.

## Findings

### DEV-01 — High: Compose frontend silently falls back to mock

`docker-compose.yml:24-26` uses `http://localhost:8000`; server-side BFF fetches
that URL from the frontend container (`frontend/lib/backend.ts:8-9,56-70`). Use
`SOLVEN_BACKEND_URL=http://backend:8000`, keep it server-only, and fail closed when
the backend is unavailable in release mode. **Verify:** Compose request creates a
backend-persisted synthetic draft and `engine=backend`.

### DEV-02 — High: Compose DB path crashes API while health stays green

Compose passes string `/data/solven.db` (`docker-compose.yml:5-7`), `main.py:30-39`
passes it to `Store`, and `db.py:47-54` expects `Path`. `/health` only returns
status/version (`main.py:70-72`). Normalize the path, migrate it, and add readiness
that opens/queries the actual DB. **Verify:** file-backed create/list/patch/audit.

### DEV-03 — Critical when used in production: fail-open launch defaults

`docker-compose.yml:5,11-12,25-28`, `.env.example`, `config.py:27-29`, and
`docs/DEPLOYMENT.md:23-32` allow known token, public backend port and mock LLM.
Require secret-manager token, private backend network, TLS edge and explicit demo
mode. **Verify:** release preflight rejects missing/default token, mock mode and
placeholder URL.

### DEV-04 — High: CI/CD does not gate dependencies or images

`.github/workflows/ci.yml:8-46` runs tests/build only; requirements are lower-bound
(`backend/requirements.txt:1-7`), and no npm/pip/image/secret scan or release smoke
exists. Add lock/hash files, patched Next/PostCSS, audit gates, SBOM/image scan,
and Compose/browser release smoke. **Verify:** high audit exits nonzero and blocks
the release until findings are remediated/approved.

### DEV-05 — Medium: container reproducibility/runtime hardening incomplete

Both Dockerfiles use floating base tags and no `USER`; frontend falls back from
`npm ci` to `npm install` (`frontend/Dockerfile:1-4,13-20`). Pin digests, enforce
lock installs, use non-root/read-only/resource limits. **Verify:** image scan and
runtime user check.

### DEV-06 — High: migration/readiness gates incomplete

`backend/app/migrate.py:3-8,46-53` documents/handles CLI input inconsistently;
only `/health` exists (`main.py:70-72`), and Compose probes only liveness. Add a
proper CLI parser, locked migration job, `/live` and `/readyz` checks, and rollout
ordering. **Verify:** `/readyz` fails on unusable DB and passes after migration.

### DEV-07 — Medium: structured logging is not emitted

`main.py:25` configures a plain formatter; middleware only places request fields in
`extra` (`middleware.py:45-53`). The runbook claims structured logging. Emit JSON
with request ID, route, status, latency, actor (redacted) and error class; add
metrics/alerts. **Verify:** captured logs parse and contain required fields.

### DEV-08 — High: no implemented DR evidence

Compose only defines one named volume (`docker-compose.yml:9-10`); backup,
retention and restore are unchecked in `docs/DEPLOYMENT.md:55-66`, and rollback is
image-only (`68-71`). Add encrypted off-host backup, RPO/RTO, restore drill and
retention expiry aligned to PDPA. **Verify:** disposable restore test passes.

### DEV-09 — Medium: deployment instructions contradict effective environment

Runbook copies `backend/.env` (`docs/DEPLOYMENT.md:17-20`), but Compose has no
`env_file` and defines values inline (`docker-compose.yml:4-8`). Operators can edit
an ignored file with no effect. Choose explicit `env_file`/secret references or
document exported root variables; print redacted effective config in preflight.

### DEV-10 — Medium: no rollback safety for data/schema changes

Docs say index migration rollback is image deploy, but future destructive schema,
retention and identity changes need forward-only compatibility and backup restore.
Add migration policy: additive expand/contract, preflight backup, rollback owner,
and explicit incompatible-release gate.

## DORA/readiness assessment

| Signal | Status |
|---|---|
| Deployment frequency | Unknown; no release workflow |
| Lead time | Unknown; no build artifact/release evidence |
| Change failure rate | Unknown; no deploy telemetry |
| MTTR | Unknown; no metrics/alerts/incident history |
| Liveness | Implemented only as `/health` |
| Readiness | Missing; DB/API failure can be green |
| Observability | Plain logs; no metrics/traces/alerts |
| DR | Not implemented/verified |
| Supply chain | No audit/image/secret gate; mutable builds |

## Phase gates

1. **Static:** CI checks pass and no known high dependency finding is unreviewed.
2. **Container:** Docker builds as pinned non-root images; Compose service DNS,
   migration, readiness and protected API smoke pass.
3. **Release:** secret/url/LLM/CORS preflight passes; TLS/edge configuration is
   externally verified; artifact is immutable and rollback owner is named.
4. **Operations:** JSON logs, readiness alerts, backups and a successful restore
   drill establish measurable RPO/RTO.
