# Solven Auth, Org & Billing Foundation — Design (v1.0)

> Status: approved 15 Aug 2026 (conversational) — pending written-spec review

## Goal

Turn Solven from single-token demo/prototype into real multi-tenant SaaS:
teachers sign up (email+password or Google/Microsoft SSO), join/create a
school **org** (tenant), get **role**-scoped access (owner/admin/teacher),
org pays via **subscription** with usage quota. This is Phase 1 of a 5-phase
roadmap — foundation everything else builds on.

Roadmap (each phase own spec→plan→build cycle):
1. **Phase 1 (this doc)** — auth/org/RBAC/billing foundation
2. **Phase 2** — Document Studio, already spec'd+approved: `2026-08-15-solven-document-studio-design.md` (explicitly out-of-scope: multi-teacher accounts — no conflict with Phase 1)
3. **Phase 3** — admin/ops console (org members, usage, billing, audit log UI)
4. **Phase 4** — UI/UX overhaul via `/impeccable`, extends not replaces `DESIGN.md`
5. **Phase 5** — production hardening (observability, load test, re-audit security given new auth+billing surface)

## Non-goal correction

`PRODUCT.md` line 30 ("ไม่ทำระบบ e-commerce/บิลลิง") is stale — billing is now
required day one. This spec updates `PRODUCT.md` non-goals list alongside
implementation.

## Architecture

**Auth/org provider: Clerk** (managed identity — Organizations feature =
tenant boundary, built-in email+password, Google/Microsoft OAuth, invites,
per-org roles).

Rejected alternative: self-rolled Auth.js (NextAuth v5) + custom
org/RBAC/Postgres schema. More control, no vendor fee, but full custom
auth/session/invite/RBAC code is a large QA surface — not worth it against
hackathon deadline pressure. Clerk chosen.

Existing seam this plugs into: `backend/app/main.py`'s `_principal()`
function already reads **BFF-trusted headers** `x-solven-principal` /
`x-solven-tenant` (comment there: "identity-aware auth (OIDC/session) MUST
be stripped/re-asserted at BFF"). Under Clerk:

- Real user auth happens entirely in the Next.js BFF (Clerk middleware +
  `auth()` in route handlers).
- BFF resolves `userId` + active `orgId` from the Clerk session, sets
  `x-solven-principal` (Clerk user id) and `x-solven-tenant` (Clerk org id)
  on the proxied request to FastAPI — same as today's pattern, just BFF-side
  values now come from real session instead of dev fallback.
- `backend/app/security.py` (Bearer-token dependency, BFF↔backend
  service-to-service auth) is **unchanged**. Backend still trusts BFF's
  headers; it does not talk to Clerk directly.
- `_principal()`'s dev/demo fallback (`{"teacher_id": "demo-teacher", ...}`
  when `settings.env != "production"`) stays for local dev without Clerk
  keys configured.

**Database: SQLite → Postgres** (Railway managed).

- `backend/app/db.py` uses raw `sqlite3`, no ORM — rewrite to `psycopg`
  (sync, same SQL-first style). Isolated, moderate-effort change: no ORM
  migration, just driver + connection + placeholder-syntax (`?` → `%s`)
  swap.
- `backend/app/migrate.py` keeps numbered-migration convention
  (`backend/migrations/00N_*.sql`, currently `001_indexes.sql`,
  `002_drafts_teacher_id.sql`) — `003_orgs_billing.sql` adds new schema
  (below), Postgres-dialect SQL.
- Reason for Postgres now (not later): multi-tenant concurrent writes,
  billing/usage counters need real transactions, Clerk webhook idempotency
  needs a real unique-constraint story.
- Test suite's `:memory:` SQLite fallback is replaced with a Postgres test
  database (Railway dev instance or local Postgres via CI service
  container) — no more in-memory DB shortcut.

## Data model (migration `003_orgs_billing.sql`)

```
orgs (
  id TEXT PRIMARY KEY,              -- Clerk org id
  name TEXT NOT NULL,
  plan TEXT NOT NULL DEFAULT 'trial',
  stripe_customer_id TEXT,
  created_at TIMESTAMPTZ NOT NULL
)

org_members (
  user_id TEXT NOT NULL,            -- Clerk user id
  org_id TEXT NOT NULL REFERENCES orgs(id),
  role TEXT NOT NULL,               -- owner | admin | teacher
  created_at TIMESTAMPTZ NOT NULL,
  PRIMARY KEY (user_id, org_id)
)

subscriptions (
  org_id TEXT NOT NULL REFERENCES orgs(id),
  stripe_sub_id TEXT NOT NULL,
  status TEXT NOT NULL,             -- active | past_due | canceled | trialing
  period_end TIMESTAMPTZ NOT NULL,
  PRIMARY KEY (org_id)
)

usage_counters (
  org_id TEXT NOT NULL REFERENCES orgs(id),
  period TEXT NOT NULL,             -- 'YYYY-MM'
  count INTEGER NOT NULL DEFAULT 0,
  quota INTEGER NOT NULL,
  PRIMARY KEY (org_id, period)
)
```

`tasks`, `drafts`, `agent_runs` each gain nullable `org_id TEXT` column
(same migration), scoped alongside existing `teacher_id`. Nullable so
existing rows (pre-migration dev data) don't break; new writes always set
`org_id` in production.

Ownership/scoping in `main.py` extends from today's `teacher_id`-only check
(`row.get("teacher_id") != principal["teacher_id"]`) to also check
`row.get("org_id") != principal["tenant"]` in production — a teacher can
only see/act on drafts inside their own org.

## Billing

**Stripe Subscriptions**, one subscription per org.

- Checkout: BFF route creates Stripe Checkout session for org (owner-only
  action), redirects to Stripe-hosted page.
- Webhook: new BFF route `frontend/app/api/billing/webhook/route.ts`
  receives `customer.subscription.*` events, updates `subscriptions` table
  (via backend or direct DB — decided in plan phase) idempotently (Stripe
  event id dedup).
- **Quota-check middleware**: FastAPI dependency, runs before task creation
  (`POST /api/coordinator`). Reads `usage_counters` for `(org_id, current
  period)`, compares `count` vs `quota`. Blocks with `402 Payment Required`
  (quota exceeded) or lets through and increments `count`. Quota value
  derived from `orgs.plan` (plan→quota mapping, e.g. trial=50/mo,
  pro=1000/mo — exact numbers decided in plan phase, not blocking design).
- No proration/upgrade-flow polish in Phase 1 — Stripe Customer Portal
  (hosted, free to integrate) handles plan changes/cancellation without
  custom UI.

## Landmine: demo-seed endpoint

`backend/app/seed.py` / `POST /api/demo/seed` (`main.py`) is already gated
`404` in production (`if settings.env == "production": raise HTTPException(404)`)
— **this is already safe**, re-verified this session, no change needed.
(Earlier flag in this design process about this endpoint being an
"unclosed landmine" is superseded by this direct code check — it was
already closed in a prior hardening pass. Noted here so the concern doesn't
resurface unexamined.)

## Config additions (`backend/app/config.py`)

New env-driven settings (all optional in dev, required by production gate
when Clerk/Stripe features are active):

- `SOLVEN_CLERK_SECRET_KEY`, `SOLVEN_CLERK_PUBLISHABLE_KEY` (frontend-side,
  `NEXT_PUBLIC_` prefixed in Next.js, not `SOLVEN_*` backend settings)
- `SOLVEN_STRIPE_SECRET_KEY`, `SOLVEN_STRIPE_WEBHOOK_SECRET`
- `SOLVEN_DATABASE_URL` (Postgres connection string, replaces `db_path`
  concept; `db_path` kept as SQLite fallback for local dev only if a plain
  Postgres-less quick-start is still desired — decided in plan phase)

`_production_gates` model validator extends: production requires
`SOLVEN_DATABASE_URL` set to a non-localhost Postgres URL, Stripe keys
present, Clerk keys present.

## File change list (representative, not exhaustive — plan phase finalizes)

| Path | Action |
|---|---|
| `frontend/middleware.ts` | NEW — Clerk middleware (route protection) |
| `frontend/app/layout.tsx` | wrap with `<ClerkProvider>` |
| `frontend/app/sign-in/[[...sign-in]]/page.tsx` | NEW — Clerk sign-in |
| `frontend/app/sign-up/[[...sign-up]]/page.tsx` | NEW — Clerk sign-up |
| `frontend/app/api/coordinator/route.ts` | resolve principal from Clerk `auth()` instead of dev header passthrough |
| `frontend/app/api/drafts/*` | same principal-resolution change |
| `frontend/app/api/billing/checkout/route.ts` | NEW — Stripe Checkout session creation |
| `frontend/app/api/billing/webhook/route.ts` | NEW — Stripe webhook handler |
| `frontend/app/api/demo/route.ts` | unchanged (already dev-only) |
| `backend/app/db.py` | rewrite `sqlite3` → `psycopg` |
| `backend/app/migrate.py` | Postgres-aware migration runner |
| `backend/migrations/003_orgs_billing.sql` | NEW — orgs/org_members/subscriptions/usage_counters + `org_id` columns |
| `backend/app/config.py` | add Clerk/Stripe/DB-url settings + production gates |
| `backend/app/main.py` | `_principal()` reads real headers (no logic change, values now real); org-scoping in ownership checks; quota-check dependency on `/api/coordinator` |
| `backend/app/billing.py` | NEW — quota-check dependency, plan→quota mapping |
| `backend/tests/test_billing.py` | NEW — quota enforcement tests |
| `backend/tests/conftest.py` | Postgres test-DB fixture (replaces `:memory:` SQLite) |
| `PRODUCT.md` | remove stale billing non-goal, add org/billing to Solution section |
| `docker-compose.yml` | add Postgres service |
| `docs/DEPLOYMENT.md` | Clerk/Stripe/Postgres env vars, Railway Postgres provisioning |

## Verification

- `pytest` in `backend/` — all existing suites green against Postgres test
  DB; new `test_billing.py` (quota block/allow, plan mapping)
- `npm run typecheck` && `npm run build` (frontend)
- Manual: sign up (email+password), sign up (Google SSO), create org,
  invite second user, verify role-scoped draft visibility across two orgs,
  Stripe Checkout test-mode subscription, quota block after exceeding trial
  limit, Stripe Customer Portal plan change reflects in `subscriptions`
  table via webhook
- `python -m app.preflight` passes with production-mode Clerk/Stripe/DB env

## Out of scope (Phase 1)

- Admin console UI for managing members/billing/usage (Phase 3)
- Fine-grained per-feature permissions beyond owner/admin/teacher role
- Proration/plan-upgrade custom UI (Stripe Customer Portal covers it)
- Self-hosted Thai LLM swap (unrelated axis, tracked separately)
- Document Studio's school settings moving from `localStorage` to
  per-org DB storage — deferred until Phase 2 is built and Phase 1 org
  model exists; will be a small follow-up once both land, not part of
  either phase's spec
