# Solven — Architecture Review

**Architect:** ARCH-ORACLE · **Date:** 2026-08-13 · **Revision:** `d6fb282`

## Actual architecture

Solven is a **prototype hybrid BFF + client-local state + synchronous Python
modular monolith**:

```text
Browser Home
  → Next App Router API routes
    → process-local Next store + lib/backend.ts
      → FastAPI routes
        → per-request LangGraph coordinator
          → agent prompt catalog → LLM provider/mock
          → rule guardrail → SQLite Store
  → IndexedDB queue + independently implemented Service Worker replay
```

The AIS LearnDi integration, Thai hosted model, PostgreSQL/Redis, identity,
retention and approval writeback are target architecture documentation, not active
runtime components (`docs/appendix-a-architecture.md:5-6,80-87,132-140`).

## Boundary/coupling map

| Hotspot | Evidence | Assessment |
|---|---|---|
| Home page | `frontend/app/page.tsx:251-579` | UI, orchestration, queue, export, review all co-located |
| BFF/store | `frontend/app/api/*`; `frontend/lib/store.ts:3-34` | Process state is a second draft authority |
| Composition root | `backend/app/main.py:13-58` | Routes own Store/migration wiring directly |
| Coordinator | `backend/app/coordinator.py:11-155` | Workflow, retry, audit, persistence, idempotency |
| DB | `backend/app/db.py:3-150` | Schema, connections, repository, serialization |
| Offline queue | `offlineQueue.ts:18-99`; `public/sw.js:30-102` | Two schemas/flush implementations can drift |
| Contracts | `frontend/lib/types.ts`; backend schema/routes/agents | Agent names and mock behavior duplicated |

## Strengths

- Drafts enter `pending` and approval status is constrained in backend routes.
- `LLMClient` is injectable and provider implementations are replaceable.
- Pydantic and strict TypeScript form reasonable local contracts.
- SQL values use parameter placeholders; security headers/request IDs/rate limiting
  have explicit middleware seams.
- Queue storage is injectable for unit testing; migrations track filenames.
- Documentation honestly identifies the target architecture rather than claiming
  LearnDi/production services already exist.

## Findings

### ARCH-01 — P1: File-backed SQLite path is type-unsafe

`Settings.db_path` is `str` (`backend/app/config.py:36-37`), passed directly to
`Store` (`backend/app/main.py:30-39`), then `.parent` is used in
`backend/app/db.py:47-57`. Compose passes `/data/solven.db` (`docker-compose.yml:5-6`).
This was reproduced as `AttributeError: 'str' object has no attribute 'parent'`.
Normalize once at the composition root and test the file-backed path. **4h.**

### ARCH-02 — P1: Compose frontend targets itself

`docker-compose.yml:24-26` injects `http://localhost:8000`, while
`frontend/lib/backend.ts:8-10,28-42` fetches from inside the frontend container.
Use a server-only backend URL with service DNS `http://backend:8000`; add runtime
Compose smoke. **4h.**

### ARCH-03 — P1: No application identity or tenant ownership

Bearer validation (`backend/app/security.py:16-28`) returns no principal. BFF routes
are unauthenticated; `TaskRequest` has no school/class/tenant identity and
`teacher_id`/`reviewed_by` are unused (`schema.py:9-15`, `db.py:11-30,117-124`).
Choose OIDC/JWT/session contract, then make repositories require principal scope.
**12h for first vertical slice; architectural decision required.**

### ARCH-04 — P1: Backend failure becomes mock success

`frontend/lib/backend.ts:27-70` catches every failure; the BFF stores and returns
the mock result (`frontend/app/api/coordinator/route.ts:25-41`). This bypasses
backend validation/audit/guardrail and makes system authority ambiguous. Production
must fail closed; demo mode must be explicit. **4h.**

### ARCH-05 — P1: Split draft authority creates temporal inconsistency

Next process memory (`frontend/lib/store.ts:3-34`) and backend SQLite
(`backend/app/db.py:19-29,97-124`) both own drafts. The PATCH route changes local
state and ignores backend mirror failures (`frontend/app/api/drafts/[id]/route.ts:16-25`).
Make FastAPI/DB authoritative; Next should be stateless BFF/cache only. **4h.**

### ARCH-06 — P1: Raw input can reach external providers

`agents.py:32-38` sends user-controlled text to providers (`llm.py:56-117`) and
stores it in SQLite. Provider selection is environment-key based, while the
approved AIS/Thai inference boundary is only documentation. Add a provider policy
port and sensitive-data routing gate. **12h; product/compliance decision required.**

### ARCH-07 — P1: Guardrail warnings do not block unsafe output

`guardrail.py:11-33` is post-generation and `coordinator.py:87-105` finalizes even
after failed retries. A failed policy result is not a distinct state. Add
pre-provider input handling, output quarantine/redaction, policy version and manual
escalation. **8h.**

### ARCH-08 — P1: Synchronous LLM execution lacks durable recovery

The frontend timeout is 30s (`frontend/lib/backend.ts:28-42`), provider calls can
wait 60s (`llm.py:56-99`), and FastAPI runs the graph inline (`main.py:74-79`,
`coordinator.py:107-155`) without a checkpointer. Add durable task state and a
worker only after the identity/data contract is stabilized. **16h first slice.**

### ARCH-09 — P2: SQLite and in-memory rate limiting set a single-process ceiling

Each file-backed operation opens a connection (`db.py:47-78`), with no visible WAL,
busy timeout, pool or distributed lock. The limiter is process-local
(`middleware.py:14-16,58-76`) and reads are unbounded (`db.py:107-145`). Harden
pilot SQLite, then migrate to PostgreSQL/Redis before multi-instance. **8h pilot.**

### ARCH-10 — P2: Audit provenance is incomplete

Prompt hash covers only `state["input"]` before rubric assembly
(`coordinator.py:60-70`, `agents.py:35-37`); output hashes are truncated
(`llm.py:120-121`); `RunRecord` lacks actor, tenant, request ID, prompt version and
actual token usage (`schema.py:31-44`). Add immutable event/provenance fields.
**8h.**

### ARCH-11 — P2: Contracts and mocks are duplicated

Agent names repeat across `frontend/lib/types.ts`, BFF route, backend schema/main/
agents. Mock logic repeats in `llm.py`, `backend.ts`, and `frontend/lib/agents.ts`.
Use a generated/shared contract or a single versioned API schema. **6h.**

### ARCH-12 — P2: Offline queue has two implementations

`offlineQueue.ts` and `sw.js` each open/flush the same conceptual store, while
`page.tsx:270-327` owns listeners and sync. Only three shell resources are
precached (`sw.js:3-27`). Define one queue protocol/schema version, TTL, conflict
state and one replay owner. **8h.**

### ARCH-13 — P2: CI does not validate production wiring

CI runs static frontend checks/backend tests only (`.github/workflows/ci.yml:9-46`);
backend tests use `:memory:` (`tests/test_coordinator.py:18-25`,
`test_migrate.py:10-18`). Add file-backed, Compose, browser, provider-failure and
authorization scope tests. **12h.**

### ARCH-14 — P1/XL: LearnDi integration is target-only

No runtime adapter, SDK/webhook/SSO contract, external ID or writeback route exists;
active routes are only health/coordinator/drafts/audit (`backend/app/main.py:70-98`).
Do not assume REST/iframe/LTI semantics. Obtain the real integration contract before
planning implementation. **Discovery first; XL implementation deferred.**

### ARCH-15 — P2: Consent, retention, deletion and lifecycle absent

Schema has tasks/drafts/runs only (`db.py:10-43`); no delete route/method exists.
Target requirements are only in architecture docs. Add lifecycle fields and
policy-backed purge/delete before pilot data. **12h.**

### ARCH-16 — P2: Deployment security defaults remain demo-grade

Default token (`config.py:27-30`), Compose fallback (`docker-compose.yml:5,26`),
unsafe-inline CSP, root/floating containers and checklist-only production changes
remain. Replace with release preflight and pinned/non-root images. **8h.**

## Target architecture

1. FastAPI + durable DB is sole draft authority; Next is stateless BFF.
2. Define ports for repositories, idempotency, LLM provider, guardrail policy and
   LearnDi adapter; keep route handlers as adapters.
3. Authenticate identity before adding real data; scope every query by tenant and
   record reviewer actor.
4. Treat student/rubric input as untrusted; enforce provider/data-residency policy,
   structured output and quarantine states.
5. Accept command → durable task state → worker/checkpoint → review → approval event.
6. One versioned offline queue contract with server idempotency and explicit conflict.
7. PostgreSQL/Redis/worker are a production migration gate, not a config-only swap.
8. LearnDi is an anti-corruption adapter with external IDs, signed events,
   idempotency and approval-gated writeback.

## Migration gates

| Gate | Exit condition |
|---|---|
| Demo reliability | File DB + Compose DNS + readiness smoke pass |
| Controlled pilot | Identity/tenant/reviewer/retention controls pass |
| Production execution | PostgreSQL/Redis/worker recovery/load tests pass |
| AIS inference | No student payload leaves approved boundary |
| LearnDi rollout | Contract, SSO, signed event and canary tests pass |
