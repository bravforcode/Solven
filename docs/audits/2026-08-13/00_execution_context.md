# Solven audit execution context

- Revision: `d6fb282` (`audit/solven-full-audit-2026-08-13`)
- Project: Solven, pre-launch Thai education web app
- Stack: Next.js 14 + TypeScript; FastAPI + LangGraph + SQLite
- Data sensitivity: student answers, rubrics, and generated feedback (PDPA)
- Scale: pre-launch; production traffic and deployment surface unknown
- Baseline: backend `32 passed`; frontend lint/typecheck/build passed
- Dependency evidence: `npm audit --omit=dev` reports 2 high; full audit 5 high
- Container evidence: `docker compose config` passes; Docker Linux engine unavailable
- Ruflo: `npx ruflo --version` reports `v3.32.8`
- CLI scan attempts: Ruflo security/coverage commands timed out; no findings inferred
- Confirmed runtime probe: `Store('/data/solven.db')._c()` raises
  `AttributeError: 'str' object has no attribute 'parent'`

## Scope

Executed applicable suite tracks: PROMPT 01 (project audit), PROMPT 04 (security),
PROMPT 07 (architecture), PROMPT 08 (testing), and PROMPT 09 (DevOps/CI).

No source code was modified during audit. Findings require human validation before
production changes, especially identity/PDPA/provider-boundary decisions.
