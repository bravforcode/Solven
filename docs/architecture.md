# Architecture — Solven (สรุป)

> Target เต็ม: `docs/appendix-a-architecture.md` · Decision records: `docs/architecture-decision-record.md`

## ภาพรวม (ปัจจุบัน)

```
Browser (PWA, offline-first)
   │  Next.js BFF (App Router, /api/*)
   │  Clerk auth → principal headers (x-solven-*)
   ▼
FastAPI + LangGraph (backend)
   coordinator StateGraph:
     route → run_agent → guardrail → retry(×2) → finalize(draft)
   ├─ agents: grading / lesson-plan / reporting
   ├─ guardrail: PII + grounding + reminder (regex v1)
   └─ audit: agent_runs (model, hash, latency, guardrail_passed)
   ▼
PostgreSQL 16 (tasks, drafts, agent_runs, orgs, org_members,
               subscriptions, usage_counters, stripe_events)
```

## Layers

| Layer | ที่อยู่ | หมายเหตุ |
|---|---|---|
| Presentation | `frontend/app`, `components/` | custom UI, Tailwind v4 |
| Application/BFF | `frontend/lib/`, `app/api/*` | fail-closed, demo-mode gating |
| Domain | `backend/app/coordinator.py`, `agents.py`, `guardrail.py` | LangGraph |
| Infrastructure | `backend/app/db.py`, `migrate.py`, `security.py`, `middleware.py` | psycopg3 raw SQL |
| AI provider | `backend/app/llm.py` | `LLMClient` ABC + adapters |
| Background jobs | — | sync เท่านั้น (ADR-012) |

## Key flows

1. **Generate:** POST /api/coordinator (BFF) → Bearer+principal → quota check → LangGraph run → draft (pending/quarantined)
2. **Review:** PATCH /api/drafts/{id} — ownership (teacher+org) verified
3. **Document:** POST /api/documents/render (BFF proxy) → reportlab PDF (NotoSansThai)
4. **Offline:** IndexedDB queue → flush → idempotent replay (client_task_id)
5. **Billing:** Stripe checkout (BFF) → webhook verify → internal sync → quota 402

## Contracts

- BFF↔backend: Bearer + `x-solven-principal` / `x-solven-tenant` / `x-solven-role` / `x-solven-org-name` (edge-injected, strip client headers)
- Result shape: FastAPI status codes + `{detail}`; idempotency via `client_task_id`
