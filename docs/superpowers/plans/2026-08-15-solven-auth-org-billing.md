# Solven Auth, Org & Billing Foundation — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** Turn Solven from single-token demo into a multi-tenant SaaS foundation: Clerk auth + orgs (tenant boundary), role-scoped access, Stripe subscription billing with usage quota, on Postgres.

**Architecture:** Clerk (managed identity + Organizations) authenticates in the Next.js BFF; the BFF resolves `userId`/`orgId`/`orgRole` from the Clerk session and sets the existing trusted headers (`x-solven-principal`, `x-solven-tenant`, plus new `x-solven-role`, `x-solven-org-name`) on proxied requests to FastAPI. Backend keeps its Bearer-token service auth and header trust model unchanged; it never talks to Clerk/Stripe directly. SQLite is replaced by Postgres (psycopg3, sync, SQL-first — same style as today's `sqlite3` code). Stripe Checkout/webhook live in the BFF; the webhook forwards verified events to a new backend internal endpoint that owns all DB writes (idempotent via `stripe_events` dedup table). Org/membership rows are provisioned lazily by a backend dependency (`INSERT ... ON CONFLICT DO NOTHING`) — no Clerk webhook infra in Phase 1.

**Tech Stack:** FastAPI + psycopg3 (Postgres 16), Next.js 14.2 App Router + `@clerk/nextjs` v6 + `stripe` (server-side), Docker Compose (db service), GitHub Actions (Postgres service for tests).

## Global Constraints

- Backend stays SQL-first raw SQL (no ORM). psycopg3 sync driver, `%s` placeholders.
- BFF↔backend service auth (`app/security.py` Bearer + `hmac.compare_digest`) is **unchanged**.
- Backend trusts only BFF-injected headers; dev/demo fallback principal (`demo-teacher`, tenant `None`) stays for `env != "production"`.
- Numbered migrations in `backend/migrations/00N_*.sql`, tracked in `schema_migrations`, idempotent, one transaction each.
- Production fail-closed gates in `app/config.py` `_production_gates` + `app/preflight.py` extend, never weaken.
- `POST /api/demo/seed` stays hard-404 in production (already implemented — no change).
- Tests run against a **Postgres** test database (`SOLVEN_TEST_DATABASE_URL`). No `:memory:` SQLite anywhere.
- Frontend: Next 14.2.35, React 18.3.1, TypeScript 5.5.4. `npm run typecheck` + `npm run build` must pass.
- **DO NOT touch `frontend/app/page.tsx`** — it has 434 lines of uncommitted Document Studio work from a previous session. Do not stage it, do not modify it.
- Do not stage/commit untracked `Meta/` or root `package.json`.
- Quota mapping (Phase 1): `trial=50/mo`, `pro=1000/mo` (`PLAN_QUOTAS` in `app/billing.py`).
- New env vars: backend `SOLVEN_DATABASE_URL`; frontend `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PRICE_ID`.

## Plan Decisions (resolves design's "decided in plan phase" — flagged for reviewer)

1. **Postgres-only, no SQLite fallback.** `db_path` setting is removed; `SOLVEN_DATABASE_URL` replaces it (dev default `postgresql://solven:solven@localhost:5432/solven`, matching the new compose `db` service). Rationale: dual-driver doubles SQL maintenance; design already mandates Postgres for tests.
2. **Stripe keys live in the BFF only** (checkout + webhook signature verification are BFF routes per design). Backend gets **no** `SOLVEN_STRIPE_*` settings — it receives already-verified events via `POST /api/internal/billing/webhook` (Bearer-guarded). Deviation from design's config list, justified by the design's own "BFF route creates Stripe Checkout session" architecture.
3. **Lazy org provisioning instead of Clerk webhooks.** New backend dependency `ensure_org_membership` upserts `orgs` + `org_members` from BFF headers on each protected request (`ON CONFLICT DO NOTHING`). Design's file list has no Clerk webhook route; this achieves the same end state with less infra. Org deletion/member-removal sync deferred to Phase 3.
4. **New BFF-trusted headers:** `x-solven-role` (Clerk org role: owner/admin/teacher) and `x-solven-org-name` (Clerk org name/slug fallback). Backend `_principal` reads them into the principal dict.
5. **`stripe_events` dedup table** added to migration 003 (Stripe event id PK, `INSERT ... ON CONFLICT DO NOTHING`).
6. **New backend internal endpoints:** `POST /api/internal/billing/webhook` (upsert subscription + org plan + dedup) and `GET /api/internal/billing/customer?org_id=` (returns `stripe_customer_id` for the Customer Portal route).
7. **New frontend `/org` page** with Clerk `OrganizationSwitcher` + `OrganizationProfile` (create org, invite members — required by manual verification flow). No dashboard changes.
8. **CSP update** in `next.config.js` for Clerk domains (`*.clerk.accounts.dev`, `img.clerk.com`) — required or Clerk UI breaks (discovered during research; absent from design).
9. **Quota increment semantics:** single atomic `INSERT ... ON CONFLICT DO UPDATE ... RETURNING count, quota`; block with `402` when `count > quota`. Over-count on blocked requests is accepted (subsequent requests are blocked anyway).
10. **Work branch:** `feat/solven-auth-org-billing` created from current HEAD (`feat/pro-ui-redesign`).

---

### Task 1: Postgres driver + test-suite migration

**Files:**
- Rewrite: `backend/app/db.py` (sqlite3 → psycopg3)
- Rewrite: `backend/app/migrate.py` (psycopg3, PG tracker table)
- Modify: `backend/app/config.py` (`db_path` → `database_url` + production gate)
- Modify: `backend/app/main.py` (startup migration path, `_resolve_db_path` removal)
- Modify: `backend/requirements.txt` (add `psycopg[binary]`)
- Create: `backend/tests/conftest.py` (PG fixtures)
- Modify: all 10 files in `backend/tests/` (drop `:memory:`, use PG fixtures)
- Modify: `.github/workflows/ci.yml` (Postgres service for backend job)
- Modify: `docker-compose.yml` (add `db` service; backend uses `SOLVEN_DATABASE_URL`)
- Create: `backend/.env.example`

**Interfaces:**
- Consumes: existing `Store` API surface (method names/behavior preserved — callers unchanged).
- Produces: `Store(database_url: str = "")`; `Store._c()` returns a psycopg connection usable as `with store._c() as conn:` (commit+close on exit); `apply_migrations(conn)` accepts a psycopg connection; `Settings.database_url`; `DB_URL_DEFAULT` constant in `app/db.py`.

- [x] **Step 1: Add psycopg and pin it**

```bash
cd backend
python -m venv .venv
.venv/Scripts/python -m pip install --upgrade pip
.venv/Scripts/python -m pip install -r requirements.txt psycopg[binary]
.venv/Scripts/python -m pip freeze | Select-String psycopg
```
Add the resolved `psycopg[binary]==<version>` line to `requirements.txt` (keep existing pins).

- [x] **Step 2: Rewrite `backend/app/db.py` for psycopg3**

Keep every public method name and behavior. Key changes:
- `import psycopg` + `from psycopg.rows import dict_row`; delete `import sqlite3`.
- `DB_URL_DEFAULT = "postgresql://solven:solven@localhost:5432/solven"`.
- `_SCHEMA` unchanged SQL (TEXT/INTEGER/REAL are valid PG types) but executed via a helper (psycopg3 has no `executescript`):

```python
def _exec_script(conn: psycopg.Connection, sql: str) -> None:
    for stmt in sql.split(";"):
        if stmt.strip():
            conn.execute(stmt)
```

- Connection factory (per-call connection; `with conn:` commits+closes):

```python
def _conn(database_url: str) -> psycopg.Connection:
    return psycopg.connect(database_url, row_factory=dict_row)
```

- `Store.__init__(self, database_url: str = "")` → `self._database_url = database_url or DB_URL_DEFAULT`; delete `_mem_conn` and the `:memory:` branch.
- `Store._c(self)` → `return _conn(self._database_url)`.
- `INSERT OR IGNORE` → `INSERT ... ON CONFLICT (id) DO NOTHING` (rowcount still 0 on conflict).
- `?` placeholders → `%s` everywhere.
- `dict(row)` no longer needed — rows are already dicts via `dict_row` (keep `dict(r)` harmless or drop).
- Delete WAL/busy_timeout pragmas (PG-specific equivalents not needed).
- `now_iso()` unchanged.

- [x] **Step 3: Rewrite `backend/app/migrate.py` for psycopg3**

```python
TRACKER = """
CREATE TABLE IF NOT EXISTS schema_migrations (
    seq BIGSERIAL PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
"""
```
- `apply_migrations(conn: psycopg.Connection, migrations_dir=None) -> list[str]`: same algorithm (exec `_SCHEMA`, exec TRACKER, read applied names, iterate sorted `*.sql`, strip `--` comment lines, split on `;`, execute each, insert tracker row) but each migration wrapped in `with conn:` (transaction) and tracker insert uses `%s`.
- CLI `main()`: `--db` accepts a Postgres URL; connect via `psycopg.connect(db_value)`; default URL = `DB_URL_DEFAULT`.

- [x] **Step 4: Update `backend/app/config.py`**

- Remove `db_path: str = ""` (line 65) and its comment.
- Add `database_url: str = ""` with comment: `# Postgres DSN (SOLVEN_DATABASE_URL); empty -> postgresql://solven:solven@localhost:5432/solven`.
- In `_production_gates`, add:

```python
if not self.database_url or "localhost" in self.database_url or "127.0.0.1" in self.database_url:
    problems.append("production requires SOLVEN_DATABASE_URL pointing to a non-localhost Postgres")
```

- [x] **Step 5: Update `backend/app/main.py` startup**

- Delete `_resolve_db_path` (lines 62-73) and the `import sqlite3` block (lines 109-114).
- Replace with:

```python
database_url = settings.database_url or DB_URL_DEFAULT
store = Store(database_url)
with store._c() as conn:
    apply_migrations(conn)
```

- Import `DB_URL_DEFAULT` from `app.db` alongside `Store`.

- [x] **Step 6: Create `backend/tests/conftest.py`**

```python
"""Postgres test fixtures — replaces the old per-file SQLite :memory: pattern.

Requires a reachable Postgres. Default: local compose db (solven/solven@localhost:5432/solven_test).
Override with SOLVEN_TEST_DATABASE_URL. Fails loudly if unreachable.
"""

import os

import pytest

TEST_DB_URL = os.environ.get(
    "SOLVEN_TEST_DATABASE_URL",
    "postgresql://solven:solven@localhost:5432/solven_test",
)

_DATA_TABLES = ("tasks", "drafts", "agent_runs")


@pytest.fixture(scope="session")
def db_url() -> str:
    import psycopg

    with psycopg.connect(TEST_DB_URL) as conn:
        conn.execute("SELECT 1")
    return TEST_DB_URL


@pytest.fixture(scope="session")
def _schema(db_url):
    from app.db import Store
    from app.migrate import apply_migrations

    store = Store(db_url)
    with store._c() as conn:
        apply_migrations(conn)
    return store


@pytest.fixture()
def store(_schema):
    with _schema._c() as conn:
        conn.execute(
            f"TRUNCATE {', '.join(_DATA_TABLES)} RESTART IDENTITY CASCADE"
        )
    return _schema
```

- [x] **Step 7: Migrate every test file off `:memory:`**

Per-file changes (keep all assertions; only swap the DB plumbing):
- `test_coordinator.py`: fixture `client` → `create_app(Settings(api_token=TOKEN, database_url=db_url))` (add `db_url` fixture param); inline `Store(":memory:")` → `Store(db_url)`.
- `test_migrate.py`: `sqlite3.connect(":memory:")` → `psycopg.connect(db_url)`; `conn.execute("SELECT name FROM schema_migrations")` rows are dicts — adjust `r[0]` → `r["name"]`; `AUTOINCREMENT`-related asserts → PG equivalents (e.g. assert `seq` is int).
- `test_persisted_db.py`: file-backed tests → use `db_url` (drop `tmp_path` file tests; keep `_resolve_db_path`-style tests only if adapted — replace with `Store(database_url="")` default-URL resolution test).
- `test_production_ready.py`: WAL/busy_timeout asserts → replace with PG-relevant asserts (e.g. `readyz` returns 200, migrations applied, orphan purge works). Keep migrate-CLI test (now URL-based).
- `test_redact.py`, `test_security.py`, `test_seed.py`, `test_tenant.py`: `Store(":memory:")` → `Store(db_url)`; `create_app(Settings(db_path=":memory:"))` → `create_app(Settings(database_url=db_url))`; add `db_url` fixture params.
- `test_config.py`, `test_preflight.py`: no DB — unchanged (but `test_config.py` may assert `db_path` field — update to `database_url`).

- [x] **Step 8: Update `.github/workflows/ci.yml` backend job**

Add a Postgres service and pass the test URL:

```yaml
    services:
      postgres:
        image: postgres:16-alpine
        env:
          POSTGRES_USER: solven
          POSTGRES_PASSWORD: solven
          POSTGRES_DB: solven_test
        ports:
          - 5432:5432
        options: >-
          --health-cmd "pg_isready -U solven -d solven_test"
          --health-interval 5s
          --health-timeout 3s
          --health-retries 10
```
And in the `Run tests` step env: `SOLVEN_TEST_DATABASE_URL: postgresql://solven:solven@localhost:5432/solven_test`.

- [x] **Step 9: Update `docker-compose.yml`** — add `db` service (postgres:16-alpine, user/pass/db `solven`, volume `solven-db`, `pg_isready` healthcheck), backend `depends_on: db: condition: service_healthy`, replace `SOLVEN_DB_PATH=/data/solven.db` with `SOLVEN_DATABASE_URL=postgresql://solven:solven@db:5432/solven`, remove `solven-data` volume (keep `solven-db`).

- [x] **Step 10: Create `backend/.env.example`**

```
SOLVEN_ENV=dev
SOLVEN_API_TOKEN=change-me-to-a-long-random-string
SOLVEN_DATABASE_URL=postgresql://solven:solven@localhost:5432/solven
SOLVEN_CORS_ORIGINS=http://localhost:3000
SOLVEN_LLM=mock
SOLVEN_RATE_LIMIT_PER_MIN=60
SOLVEN_RETENTION_DAYS=180
```

- [x] **Step 11: Verify**

```bash
cd backend
.venv/Scripts/python -m pytest tests -q
```
Expected: all suites green against Postgres (start local PG first: `docker compose up -d db` or any reachable PG; create `solven_test` DB). If Docker Desktop is not running, start it and wait for the engine.

- [x] **Step 12: Commit**

```bash
git add backend/app/db.py backend/app/migrate.py backend/app/config.py backend/app/main.py backend/requirements.txt backend/tests backend/.env.example .github/workflows/ci.yml docker-compose.yml
git commit -m "feat(backend): Postgres driver (psycopg3) + test suite on Postgres, compose db service"
```

---

### Task 2: Migration 003 + org/billing store methods

**Files:**
- Create: `backend/migrations/003_orgs_billing.sql`
- Modify: `backend/app/db.py` (org/billing store methods + `org_id` on writes/scoping)
- Modify: `backend/tests/conftest.py` (extend `_DATA_TABLES`)
- Modify: `backend/tests/test_migrate.py` (003 applies)
- Create: `backend/tests/test_orgs_store.py`

**Interfaces:**
- Consumes: Task 1's psycopg `Store`.
- Produces (used by Task 3): `Store.ensure_org(org_id, name, plan="trial")`, `Store.ensure_member(user_id, org_id, role)`, `Store.get_org_plan(org_id) -> str`, `Store.increment_usage(org_id, period, quota) -> dict{count, quota}`, `Store.upsert_subscription(org_id, stripe_sub_id, status, period_end)`, `Store.set_org_plan(org_id, plan)`, `Store.set_org_stripe_customer(org_id, customer_id)`, `Store.get_org_stripe_customer(org_id) -> Optional[str]`, `Store.record_stripe_event(event_id) -> bool`; extended signatures `create_task(..., org_id=None)`, `add_draft(..., org_id=None)`, `add_run(run, org_id=None)`, `list_drafts(teacher_id=None, org_id=None, ...)`, `list_runs_for_teacher(teacher_id, org_id=None, ...)`.

- [x] **Step 1: Write `backend/migrations/003_orgs_billing.sql`**

```sql
-- 003: orgs, org_members, subscriptions, usage_counters, stripe_events + org_id columns
CREATE TABLE IF NOT EXISTS orgs (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    plan TEXT NOT NULL DEFAULT 'trial',
    stripe_customer_id TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS org_members (
    user_id TEXT NOT NULL,
    org_id TEXT NOT NULL REFERENCES orgs(id),
    role TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (user_id, org_id)
);
CREATE TABLE IF NOT EXISTS subscriptions (
    org_id TEXT NOT NULL REFERENCES orgs(id),
    stripe_sub_id TEXT NOT NULL,
    status TEXT NOT NULL,
    period_end TIMESTAMPTZ NOT NULL,
    PRIMARY KEY (org_id)
);
CREATE TABLE IF NOT EXISTS usage_counters (
    org_id TEXT NOT NULL REFERENCES orgs(id),
    period TEXT NOT NULL,
    count INTEGER NOT NULL DEFAULT 0,
    quota INTEGER NOT NULL,
    PRIMARY KEY (org_id, period)
);
CREATE TABLE IF NOT EXISTS stripe_events (
    event_id TEXT PRIMARY KEY,
    received_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE tasks ADD COLUMN org_id TEXT;
ALTER TABLE drafts ADD COLUMN org_id TEXT;
ALTER TABLE agent_runs ADD COLUMN org_id TEXT;
```

- [x] **Step 2: Write failing store tests (`backend/tests/test_orgs_store.py`)**

Cover: `ensure_org` idempotent (second call no-op), `ensure_member` upserts role, `get_org_plan` default `trial`, `increment_usage` returns growing count and sets quota, `upsert_subscription` overwrites, `record_stripe_event` returns True first / False duplicate, `create_task`/`add_draft`/`add_run` persist `org_id`, `list_drafts(org_id=...)` scopes, `list_runs_for_teacher(org_id=...)` scopes.

- [x] **Step 3: Implement store methods in `backend/app/db.py`**

Patterns (all `%s`, `ON CONFLICT`):

```python
def ensure_org(self, org_id: str, name: str, plan: str = "trial") -> None:
    with self._c() as conn:
        conn.execute(
            "INSERT INTO orgs (id, name, plan) VALUES (%s, %s, %s) ON CONFLICT (id) DO NOTHING",
            (org_id, name, plan),
        )

def ensure_member(self, user_id: str, org_id: str, role: str) -> None:
    with self._c() as conn:
        conn.execute(
            "INSERT INTO org_members (user_id, org_id, role) VALUES (%s, %s, %s) "
            "ON CONFLICT (user_id, org_id) DO UPDATE SET role = EXCLUDED.role",
            (user_id, org_id, role),
        )

def get_org_plan(self, org_id: str) -> str:
    with self._c() as conn:
        row = conn.execute("SELECT plan FROM orgs WHERE id = %s", (org_id,)).fetchone()
    return row["plan"] if row else "trial"

def increment_usage(self, org_id: str, period: str, quota: int) -> dict:
    with self._c() as conn:
        row = conn.execute(
            "INSERT INTO usage_counters (org_id, period, count, quota) VALUES (%s, %s, 1, %s) "
            "ON CONFLICT (org_id, period) DO UPDATE SET count = usage_counters.count + 1, quota = EXCLUDED.quota "
            "RETURNING count, quota",
            (org_id, period, quota),
        ).fetchone()
    return dict(row)

def upsert_subscription(self, org_id: str, stripe_sub_id: str, status: str, period_end: str) -> None:
    with self._c() as conn:
        conn.execute(
            "INSERT INTO subscriptions (org_id, stripe_sub_id, status, period_end) VALUES (%s, %s, %s, %s) "
            "ON CONFLICT (org_id) DO UPDATE SET stripe_sub_id = EXCLUDED.stripe_sub_id, "
            "status = EXCLUDED.status, period_end = EXCLUDED.period_end",
            (org_id, stripe_sub_id, status, period_end),
        )

def set_org_plan(self, org_id: str, plan: str) -> None:
    with self._c() as conn:
        conn.execute("UPDATE orgs SET plan = %s WHERE id = %s", (plan, org_id))

def set_org_stripe_customer(self, org_id: str, customer_id: str) -> None:
    with self._c() as conn:
        conn.execute("UPDATE orgs SET stripe_customer_id = %s WHERE id = %s", (customer_id, org_id))

def get_org_stripe_customer(self, org_id: str) -> Optional[str]:
    with self._c() as conn:
        row = conn.execute("SELECT stripe_customer_id FROM orgs WHERE id = %s", (org_id,)).fetchone()
    return row["stripe_customer_id"] if row else None

def record_stripe_event(self, event_id: str) -> bool:
    with self._c() as conn:
        cur = conn.execute(
            "INSERT INTO stripe_events (event_id) VALUES (%s) ON CONFLICT (event_id) DO NOTHING",
            (event_id,),
        )
    return cur.rowcount > 0
```

Extend existing methods: `create_task(..., org_id=None)` (add column to INSERT), `add_draft(..., org_id=None)`, `add_run(run, org_id=None)` (add `"org_id"` to the INSERT), `list_drafts(teacher_id=None, org_id=None, ...)` (build WHERE from present filters: `WHERE teacher_id = %s AND org_id = %s`), `list_runs_for_teacher(teacher_id, org_id=None, ...)` (add `AND t.org_id = %s` when org_id given).

- [x] **Step 4: Update `backend/tests/conftest.py`** — `_DATA_TABLES = ("tasks", "drafts", "agent_runs", "orgs", "org_members", "subscriptions", "usage_counters", "stripe_events")`.

- [x] **Step 5: Extend `backend/tests/test_migrate.py`** — assert 003 applied (e.g. `SELECT COUNT(*) FROM orgs` works, `information_schema.columns` shows `orgs` table).

- [x] **Step 6: Verify**

```bash
cd backend
.venv/Scripts/python -m pytest tests -q
```
Expected: all green (old + new).

- [x] **Step 7: Commit**

```bash
git add backend/migrations/003_orgs_billing.sql backend/app/db.py backend/tests/conftest.py backend/tests/test_migrate.py backend/tests/test_orgs_store.py
git commit -m "feat(backend): org/billing schema (003) + store methods with org scoping"
```

---

### Task 3: Org/billing API layer (dependencies, scoping, internal webhook)

**Files:**
- Create: `backend/app/principal.py` (moved `_Principal` + `_principal` from main.py, extended with `role`/`org_name`)
- Create: `backend/app/orgs.py` (`ensure_org_membership` dependency)
- Create: `backend/app/billing.py` (`PLAN_QUOTAS`, `quota_for_plan`, `require_quota` dependency)
- Modify: `backend/app/main.py` (use `principal_from`, org scoping in ownership checks + list_drafts + audit, quota dep on `/api/coordinator`, internal billing webhook + customer endpoints)
- Modify: `backend/app/coordinator.py` (`org_id` threading through `run_task`/`CoordState`/`finalize`)
- Modify: `backend/app/schema.py` (webhook event model)
- Create: `backend/tests/test_billing.py`
- Create: `backend/tests/test_orgs_api.py`
- Modify: `backend/tests/test_tenant.py` (org-scoped scenarios)

**Interfaces:**
- Consumes: Task 2 store methods; Task 1 `Settings.database_url`.
- Produces: `principal_from(request, settings) -> dict{teacher_id, tenant, role, org_name}`; `ensure_org_membership(store, settings)` dependency factory; `require_quota(store, settings)` dependency factory; `POST /api/internal/billing/webhook`; `GET /api/internal/billing/customer?org_id=`.

- [x] **Step 1: Create `backend/app/principal.py`** — move `_Principal` TypedDict + `_principal()` from main.py verbatim, rename to `Principal` + `principal_from`, extend:

```python
class Principal(TypedDict):
    teacher_id: str
    tenant: Optional[str]
    role: Optional[str]
    org_name: Optional[str]
```
Read `x-solven-role` and `x-solven-org-name` headers (strip; None when absent). Keep the dev fallback and the 401-on-blank behavior.

- [x] **Step 2: Create `backend/app/orgs.py`**

```python
"""Org membership provisioning (Phase 1: lazy sync from BFF-trusted headers)."""

from fastapi import HTTPException, Request

from app.config import Settings
from app.db import Store
from app.principal import principal_from


def ensure_org_membership(store: Store, settings: Settings):
    """FastAPI dependency: upsert org + membership rows for the request principal.

    Runs before quota checks so orgs always exist when usage is counted.
    No-op in dev/demo or when the principal has no tenant.
    """

    def dep(request: Request) -> None:
        principal = principal_from(request, settings)
        if settings.env != "production" or not principal["tenant"]:
            return
        store.ensure_org(
            principal["tenant"],
            name=principal.get("org_name") or principal["tenant"],
        )
        store.ensure_member(
            principal["teacher_id"],
            principal["tenant"],
            role=principal.get("role") or "teacher",
        )

    return dep
```

- [x] **Step 3: Create `backend/app/billing.py`**

```python
"""Billing: plan->quota mapping + quota-check dependency (Phase 1)."""

from datetime import datetime, timezone

from fastapi import HTTPException, Request

from app.config import Settings
from app.db import Store
from app.principal import principal_from

PLAN_QUOTAS = {"trial": 50, "pro": 1000}
DEFAULT_QUOTA = 50


def quota_for_plan(plan: str) -> int:
    return PLAN_QUOTAS.get(plan, DEFAULT_QUOTA)


def require_quota(store: Store, settings: Settings):
    """FastAPI dependency for POST /api/coordinator: atomic usage increment,
    402 when the org's period count exceeds its plan quota. No-op in dev/demo
    or when the principal has no tenant."""

    def dep(request: Request) -> None:
        principal = principal_from(request, settings)
        if settings.env != "production" or not principal["tenant"]:
            return
        period = datetime.now(timezone.utc).strftime("%Y-%m")
        quota = quota_for_plan(store.get_org_plan(principal["tenant"]))
        row = store.increment_usage(principal["tenant"], period, quota)
        if row["count"] > row["quota"]:
            raise HTTPException(status_code=402, detail="org quota exceeded for this period")

    return dep
```

- [x] **Step 4: Update `backend/app/schema.py`** — add:

```python
class BillingWebhookEvent(BaseModel):
    event_id: str
    type: str
    data: dict
```

- [x] **Step 5: Update `backend/app/coordinator.py`** — add `org_id: str | None = None` param to `run_task`; add `org_id` to `CoordState`; pass `org_id=org_id` to `create_task`, `add_draft`, `add_run`; replay lookup `store.list_drafts(teacher_id=teacher_id, org_id=org_id)`.

- [x] **Step 6: Update `backend/app/main.py`**

- Replace `_principal`/`_Principal` with `from app.principal import principal_from`; update call sites (`principal = principal_from(request, settings)`).
- Ownership checks (PATCH + DELETE drafts): extend to org:

```python
if settings.env == "production" and (
    row.get("teacher_id") != principal["teacher_id"]
    or row.get("org_id") != principal["tenant"]
):
    raise HTTPException(403, "not your draft")
```

- `list_drafts`: pass both scopes in production:

```python
teacher_id = principal["teacher_id"] if settings.env == "production" else None
org_id = principal["tenant"] if settings.env == "production" else None
return [_to_out(d) for d in store.list_drafts(teacher_id=teacher_id, org_id=org_id, limit=limit, offset=offset)]
```

- `audit`: `store.list_runs_for_teacher(principal["teacher_id"], org_id=principal["tenant"], ...)`.
- `/api/coordinator`: add dependencies `ensure_org_membership(store, settings)` and `require_quota(store, settings)` (after `require_token`); pass `org_id=principal["tenant"]` to `run_task`.
- New internal endpoints:

```python
@app.post("/api/internal/billing/webhook", dependencies=[require_token], tags=["internal"])
def billing_webhook(body: BillingWebhookEvent) -> dict:
    """Idempotent subscription sync — called by the BFF after Stripe signature
    verification. Dedup by Stripe event id."""
    if not store.record_stripe_event(body.event_id):
        return {"received": True, "duplicate": True}
    data = body.data
    org_id = data.get("org_id")
    if not org_id:
        return {"received": True, "skipped": "no org_id"}
    if body.type in ("customer.subscription.created", "customer.subscription.updated"):
        store.upsert_subscription(
            org_id,
            data["stripe_sub_id"],
            data.get("status", "active"),
            data.get("period_end") or now_iso(),
        )
        if data.get("plan"):
            store.set_org_plan(org_id, data["plan"])
        if data.get("customer_id"):
            store.set_org_stripe_customer(org_id, data["customer_id"])
    elif body.type == "customer.subscription.deleted":
        store.upsert_subscription(org_id, data["stripe_sub_id"], "canceled", data.get("period_end") or now_iso())
    return {"received": True}

@app.get("/api/internal/billing/customer", dependencies=[require_token], tags=["internal"])
def billing_customer(org_id: str) -> dict:
    customer_id = store.get_org_stripe_customer(org_id)
    if not customer_id:
        raise HTTPException(404, "no stripe customer for org")
    return {"customer_id": customer_id}
```

- [x] **Step 7: Write `backend/tests/test_billing.py`**

Cover (production env, tenant header set):
- quota allowed: submit N tasks (N < quota) → 200; usage counter increments.
- quota blocked: exceed quota (set `usage_counters` count near quota first, or use a tiny quota via direct DB update of `orgs.plan` to an unknown plan with `DEFAULT_QUOTA`... simplest: insert org with plan `trial`, then `UPDATE orgs SET plan='trial'` and pre-seed `usage_counters` count=49 via store, then 2 submits → 1st 200, 2nd 402).
- dev mode: no quota enforcement (tenant None).
- `quota_for_plan` mapping: trial=50, pro=1000, unknown=50.
- webhook: `record_stripe_event` dedup — same event_id twice → second returns duplicate; subscription upsert + plan update; deleted → canceled.

- [x] **Step 8: Write `backend/tests/test_orgs_api.py`**

Cover:
- production submit with tenant → org + membership rows exist (query store).
- production submit without tenant → 403? **No** — per design, tenant-less production requests still work with `org_id=None` writes; assert draft created with `org_id=None` and quota skipped. (Document this behavior.)
- cross-org visibility: teacher A in org-1, teacher B in org-2 → B cannot see A's draft (list + PATCH + DELETE → 403/empty).
- same org, different teachers → both see org drafts (org-scoped, not teacher-scoped).
- role header stored: submit with `x-solven-role: owner` → `org_members.role == "owner"`.

- [x] **Step 9: Extend `backend/tests/test_tenant.py`** — existing tests keep passing (tenant-less production flows unchanged); add org-scoped variants where the new checks apply.

- [x] **Step 10: Verify**

```bash
cd backend
.venv/Scripts/python -m pytest tests -q
```
Expected: all green.

- [x] **Step 11: Commit**

```bash
git add backend/app/principal.py backend/app/orgs.py backend/app/billing.py backend/app/main.py backend/app/coordinator.py backend/app/schema.py backend/tests/test_billing.py backend/tests/test_orgs_api.py backend/tests/test_tenant.py
git commit -m "feat(backend): org scoping, quota enforcement (402), internal billing webhook"
```

---

### Task 4: Frontend Clerk auth

**Files:**
- Modify: `frontend/package.json` (add `@clerk/nextjs`)
- Create: `frontend/middleware.ts`
- Modify: `frontend/app/layout.tsx` (wrap `<ClerkProvider>`)
- Create: `frontend/app/sign-in/[[...sign-in]]/page.tsx`
- Create: `frontend/app/sign-up/[[...sign-up]]/page.tsx`
- Create: `frontend/app/org/page.tsx`
- Rewrite: `frontend/lib/bffAuth.ts` (Clerk `auth()` instead of request headers)
- Modify: `frontend/app/api/coordinator/route.ts`, `frontend/app/api/demo/seed/route.ts`, `frontend/app/api/drafts/route.ts`, `frontend/app/api/drafts/[id]/route.ts` (async `requirePrincipal`)
- Modify: `frontend/next.config.js` (CSP for Clerk)
- Modify: `frontend/.env.example`

**Interfaces:**
- Consumes: nothing from Tasks 1-3 (backend contract unchanged — same headers, now real values).
- Produces: `requirePrincipal()` async → `{ok: true, principal: {teacherId, tenant?, role?, orgName?}} | {ok: false, response}`; BFF sets `x-solven-role` + `x-solven-org-name` headers alongside existing ones.

- [x] **Step 1: Install Clerk**

```bash
cd frontend
npm install @clerk/nextjs
```
(Resolves latest v6; verify `npm ls @clerk/nextjs`.)

- [x] **Step 2: Create `frontend/middleware.ts`**

```ts
import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

const isPublicRoute = createRouteMatcher([
  "/sign-in(.*)",
  "/sign-up(.*)",
  "/api/billing/webhook(.*)",
]);

export default clerkMiddleware(async (auth, req) => {
  if (!isPublicRoute(req)) await auth.protect();
});

export const config = {
  matcher: ["/((?!.*\\..*|_next).*)", "/", "/(api|trpc)(.*)"],
};
```

- [x] **Step 3: Wrap `frontend/app/layout.tsx`** — import `ClerkProvider` from `@clerk/nextjs`; wrap the existing providers: `<ClerkProvider><ServiceWorkerRegister /><ErrorBoundary><ToastProvider>{children}</ToastProvider></ErrorBoundary></ClerkProvider>`.

- [x] **Step 4: Create sign-in/sign-up pages**

`frontend/app/sign-in/[[...sign-in]]/page.tsx`:
```tsx
import { SignIn } from "@clerk/nextjs";

export default function SignInPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#0a2540] p-4">
      <SignIn />
    </main>
  );
}
```
`frontend/app/sign-up/[[...sign-up]]/page.tsx`: same with `<SignUp />`.

- [x] **Step 5: Create `frontend/app/org/page.tsx`** — org management (create/switch/invite):

```tsx
import { OrganizationProfile, OrganizationSwitcher, UserButton } from "@clerk/nextjs";

export default function OrgPage() {
  return (
    <main className="mx-auto max-w-3xl space-y-6 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">องค์กร</h1>
        <div className="flex items-center gap-3">
          <OrganizationSwitcher />
          <UserButton />
        </div>
      </div>
      <OrganizationProfile />
    </main>
  );
}
```

- [x] **Step 6: Rewrite `frontend/lib/bffAuth.ts`**

```ts
import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

// BFF identity guard (AUD-C-03 / SEC-C-01 / ARCH-03).
// Production: principal comes from the Clerk session (auth()), not from
// client-supplied headers. Demo mode keeps the fixed local identity.
const DEMO_MODE = process.env.NEXT_PUBLIC_SOLVEN_MODE === "demo";

export interface Principal {
  teacherId: string;
  tenant?: string;
  role?: string;
  orgName?: string;
}

export function isDemoMode(): boolean {
  return DEMO_MODE;
}

export async function requirePrincipal():
  | { ok: true; principal: Principal }
  | { ok: false; response: NextResponse } {
  if (DEMO_MODE) {
    return { ok: true, principal: { teacherId: "demo-teacher" } };
  }
  const session = await auth();
  if (!session.userId) {
    return {
      ok: false,
      response: NextResponse.json({ error: "unauthenticated" }, { status: 401 }),
    };
  }
  const claims = session.sessionClaims as Record<string, unknown> | null | undefined;
  return {
    ok: true,
    principal: {
      teacherId: session.userId,
      tenant: session.orgId ?? undefined,
      role: (claims?.org_role as string) ?? undefined,
      orgName: (claims?.org_name as string) ?? (claims?.org_slug as string) ?? undefined,
    },
  };
}
```

- [x] **Step 7: Update the 4 API routes** — `const p = await requirePrincipal(); if (!p.ok) return p.response;` then forward headers. In `frontend/lib/backend.ts` (or the routes), add `x-solven-role` and `x-solven-org-name` to `principalHeaders` when present. Keep demo-mode behavior identical.

- [x] **Step 8: Update `frontend/next.config.js` CSP** — add Clerk domains:

```js
const scriptSrc = isDev
  ? "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://*.clerk.accounts.dev"
  : "script-src 'self' 'unsafe-inline' https://*.clerk.accounts.dev";
// CSP value:
// `default-src 'self'; ${scriptSrc}; style-src 'self' 'unsafe-inline' https://*.clerk.accounts.dev; ` +
// "img-src 'self' data: https://img.clerk.com; font-src 'self' data: https://*.clerk.accounts.dev; " +
// "connect-src 'self' https://*.clerk.accounts.dev wss://*.clerk.accounts.dev; frame-src https://*.clerk.accounts.dev"
```

- [x] **Step 9: Update `frontend/.env.example`** — add:

```
# Clerk (https://dashboard.clerk.com) — BFF auth + orgs
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=
CLERK_SECRET_KEY=
```

- [x] **Step 10: Verify**

```bash
cd frontend
npm run typecheck
npm run build
```
Build with dummy keys (ClerkProvider renders at build time):
```bash
$env:NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY="pk_test_c29sdmVuLWR1bW15LWtleQ"; $env:CLERK_SECRET_KEY="sk_test_c29sdmVuLWR1bW15LWtleQ"; npm run build
```
Expected: typecheck + build pass.

- [x] **Step 11: Commit**

```bash
git add frontend/package.json frontend/package-lock.json frontend/middleware.ts frontend/app/layout.tsx frontend/app/sign-in frontend/app/sign-up frontend/app/org frontend/lib/bffAuth.ts frontend/app/api/coordinator/route.ts frontend/app/api/demo/seed/route.ts frontend/app/api/drafts/route.ts frontend/app/api/drafts/[id]/route.ts frontend/lib/backend.ts frontend/next.config.js frontend/.env.example
git commit -m "feat(frontend): Clerk auth — middleware, provider, sign-in/up, org page, BFF principal from session"
```

---

### Task 5: Frontend Stripe billing

**Files:**
- Modify: `frontend/package.json` (add `stripe`)
- Create: `frontend/app/api/billing/checkout/route.ts`
- Create: `frontend/app/api/billing/webhook/route.ts`
- Create: `frontend/app/api/billing/portal/route.ts`
- Modify: `frontend/.env.example`

**Interfaces:**
- Consumes: Task 3's `POST /api/internal/billing/webhook` + `GET /api/internal/billing/customer`; Task 4's auth.
- Produces: `POST /api/billing/checkout` → `{url}`; `POST /api/billing/webhook` (Stripe signature verified, forwards to backend); `POST /api/billing/portal` → `{url}`.

- [x] **Step 1: Install Stripe**

```bash
cd frontend
npm install stripe
```

- [x] **Step 2: Create `frontend/app/api/billing/checkout/route.ts`**

```ts
import { NextResponse } from "next/server";
import Stripe from "stripe";
import { auth } from "@clerk/nextjs/server";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY ?? "");

export async function POST() {
  const session = await auth();
  if (!session.userId || !session.orgId) {
    return NextResponse.json({ error: "no org" }, { status: 403 });
  }
  const role =
    session.orgRole ?? (session.sessionClaims as Record<string, unknown> | null)?.org_role;
  if (role !== "owner") {
    return NextResponse.json({ error: "owner only" }, { status: 403 });
  }
  const priceId = process.env.STRIPE_PRICE_ID;
  if (!priceId) {
    return NextResponse.json({ error: "billing not configured" }, { status: 503 });
  }
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  const checkout = await stripe.checkout.sessions.create({
    mode: "subscription",
    line_items: [{ price: priceId, quantity: 1 }],
    client_reference_id: session.orgId,
    subscription_data: { metadata: { org_id: session.orgId, plan: "pro" } },
    success_url: `${siteUrl}/org?billing=success`,
    cancel_url: `${siteUrl}/org?billing=canceled`,
  });
  return NextResponse.json({ url: checkout.url });
}
```

- [x] **Step 3: Create `frontend/app/api/billing/webhook/route.ts`**

```ts
import { NextResponse } from "next/server";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY ?? "");

export async function POST(req: Request) {
  const sig = req.headers.get("stripe-signature");
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!sig || !secret) {
    return NextResponse.json({ error: "not configured" }, { status: 503 });
  }
  const raw = await req.text();
  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(raw, sig, secret);
  } catch {
    return NextResponse.json({ error: "invalid signature" }, { status: 400 });
  }
  if (!event.type.startsWith("customer.subscription.")) {
    return NextResponse.json({ received: true });
  }
  const sub = event.data.object as Stripe.Subscription;
  const orgId = sub.metadata?.org_id;
  if (!orgId) {
    return NextResponse.json({ received: true, skipped: "no org_id" });
  }
  const backendUrl =
    process.env.SOLVEN_BACKEND_URL ??
    process.env.NEXT_PUBLIC_SOLVEN_API_URL ??
    "http://localhost:8000";
  const res = await fetch(`${backendUrl}/api/internal/billing/webhook`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.SOLVEN_API_TOKEN ?? ""}`,
    },
    body: JSON.stringify({
      event_id: event.id,
      type: event.type,
      data: {
        org_id: orgId,
        stripe_sub_id: sub.id,
        status: sub.status,
        period_end: new Date((sub.current_period_end ?? 0) * 1000).toISOString(),
        plan: sub.metadata?.plan ?? null,
        customer_id: typeof sub.customer === "string" ? sub.customer : sub.customer?.id ?? null,
      },
    }),
  });
  if (!res.ok) {
    return NextResponse.json({ error: "backend sync failed" }, { status: 502 });
  }
  return NextResponse.json({ received: true });
}
```

- [x] **Step 4: Create `frontend/app/api/billing/portal/route.ts`**

```ts
import { NextResponse } from "next/server";
import Stripe from "stripe";
import { auth } from "@clerk/nextjs/server";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY ?? "");

export async function POST() {
  const session = await auth();
  if (!session.userId || !session.orgId) {
    return NextResponse.json({ error: "no org" }, { status: 403 });
  }
  const backendUrl =
    process.env.SOLVEN_BACKEND_URL ??
    process.env.NEXT_PUBLIC_SOLVEN_API_URL ??
    "http://localhost:8000";
  const res = await fetch(
    `${backendUrl}/api/internal/billing/customer?org_id=${encodeURIComponent(session.orgId)}`,
    { headers: { Authorization: `Bearer ${process.env.SOLVEN_API_TOKEN ?? ""}` } }
  );
  if (!res.ok) {
    return NextResponse.json({ error: "no subscription yet" }, { status: 404 });
  }
  const { customer_id } = await res.json();
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  const portal = await stripe.billingPortal.sessions.create({
    customer: customer_id,
    return_url: `${siteUrl}/org`,
  });
  return NextResponse.json({ url: portal.url });
}
```

- [x] **Step 5: Update `frontend/.env.example`** — add `STRIPE_SECRET_KEY=`, `STRIPE_WEBHOOK_SECRET=`, `STRIPE_PRICE_ID=` with comments (test-mode keys from dashboard.stripe.com).

- [x] **Step 6: Verify**

```bash
cd frontend
npm run typecheck
$env:NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY="pk_test_c29sdmVuLWR1bW15LWtleQ"; $env:CLERK_SECRET_KEY="sk_test_c29sdmVuLWR1bW15LWtleQ"; npm run build
```
Expected: pass.

- [x] **Step 7: Commit**

```bash
git add frontend/package.json frontend/package-lock.json frontend/app/api/billing frontend/.env.example
git commit -m "feat(frontend): Stripe billing — checkout, webhook (verified -> backend), customer portal"
```

---

### Task 6: Docs, compose wiring, preflight

**Files:**
- Modify: `PRODUCT.md` (remove stale billing non-goal; add org/billing to Solution)
- Modify: `docs/DEPLOYMENT.md` (env vars, Railway Postgres, edge contract update, test DB, manual verification runbook)
- Modify: `docker-compose.yml` (frontend env wiring for Clerk/Stripe)
- Modify: `backend/app/preflight.py` (database_url gate note — Settings gate already covers; add explicit message if needed)
- Modify: `.github/workflows/ci.yml` (frontend job dummy Clerk keys for build)

- [x] **Step 1: Update `PRODUCT.md`** — delete line `- ไม่ทำระบบ e-commerce/บิลลิง` from Non-goals; add to Solution section: `multi-tenant org (Clerk) + role-scoped access (owner/admin/teacher) + Stripe subscription billing พร้อม usage quota (Postgres)`.

- [x] **Step 2: Update `docs/DEPLOYMENT.md`** — env table additions (`SOLVEN_DATABASE_URL`, `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PRICE_ID`, `SOLVEN_TEST_DATABASE_URL`), Railway Postgres provisioning section, edge contract: add `x-solven-role` + `x-solven-org-name` (BFF-injected, must be stripped/re-asserted), compose `db` service note, local test setup (`docker compose up -d db` + create `solven_test`), manual verification runbook (sign-up email/Google, create org, invite, cross-org draft visibility, Stripe test-mode checkout, quota block, portal plan change → webhook → `subscriptions` table).

- [x] **Step 3: Update `docker-compose.yml` frontend env** — add `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=${NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY:-}`, `CLERK_SECRET_KEY=${CLERK_SECRET_KEY:-}`, `STRIPE_SECRET_KEY=${STRIPE_SECRET_KEY:-}`, `STRIPE_WEBHOOK_SECRET=${STRIPE_WEBHOOK_SECRET:-}`, `STRIPE_PRICE_ID=${STRIPE_PRICE_ID:-}`, `NEXT_PUBLIC_SITE_URL=${NEXT_PUBLIC_SITE_URL:-http://localhost:3000}`.

- [x] **Step 4: Update `.github/workflows/ci.yml` frontend build env** — add dummy keys:

```yaml
        env:
          NEXT_TELEMETRY_DISABLED: "1"
          NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: "pk_test_c29sdmVuLWR1bW15LWtleQ"
          CLERK_SECRET_KEY: "sk_test_c29sdmVuLWR1bW15LWtleQ"
```

- [x] **Step 5: Verify preflight**

```bash
cd backend
$env:SOLVEN_ENV="production"; $env:SOLVEN_DATABASE_URL="postgresql://solven:solven@localhost:5432/solven"; $env:SOLVEN_API_TOKEN="x"*40; $env:SOLVEN_CORS_ORIGINS="https://app.example.com"; $env:SOLVEN_LLM="anthropic"; $env:ANTHROPIC_API_KEY="test-key"
.venv/Scripts/python -m app.preflight
```
Expected: FAIL listing localhost DATABASE_URL (proves the new gate). Then with a non-localhost URL → PASS (or fail only on other intentionally-missing prod vars — document expected output).

- [x] **Step 6: Full verification pass**

```bash
cd backend && .venv/Scripts/python -m pytest tests -q
cd frontend && npm run typecheck && npm run build
```
Expected: all green.

- [x] **Step 7: Commit**

```bash
git add PRODUCT.md docs/DEPLOYMENT.md docker-compose.yml backend/app/preflight.py .github/workflows/ci.yml
git commit -m "docs(deploy): Clerk/Stripe/Postgres env + Railway provisioning; compose + CI wiring"
```

---

## Out of scope (Phase 1 — do NOT build)

- Admin console UI (Phase 3), fine-grained permissions beyond owner/admin/teacher, proration/upgrade UI (Stripe Portal covers), Clerk webhooks for org/member lifecycle sync (lazy provisioning instead), Document Studio school-settings DB storage, self-hosted Thai LLM swap.
- Real Clerk/Stripe credentials and live manual flows (sign-up, SSO, checkout, portal) — require human with dashboard access; runbook provided in DEPLOYMENT.md.