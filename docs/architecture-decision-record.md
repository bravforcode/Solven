# Architecture Decision Records — Solven

> แต่ละข้อ: **Context** (ทำไม) → **Decision** (เลือกอะไร) → **Consequences** (ผลตามมา)
> Status: Accepted (A) / Deferred (D)

---

## ADR-001: Next.js App Router + TypeScript เป็น core (ไม่ใช้ Vite)

- **Context:** ระบบต้องมี server-side AI, auth, file processing, protected routes, production deploy ในแอปเดียว แม้ทีมถนัด Vite แต่ Vite ไม่มี server runtime
- **Decision:** Next.js 14.2 App Router + TS strict; BFF pattern (Next API routes เป็น trust boundary ระหว่าง browser กับ FastAPI)
- **Consequences:** เสียเวลาเรียนรู้ App Router เล็กน้อย แต่ได้ server actions/BFF/middleware ในตัวเดียว (A)

## ADR-002: Backend แยกเป็น Python FastAPI + LangGraph

- **Context:** Agent orchestration เป็น state machine (route → agent → guardrail → retry → finalize); โจทย์บังคับ LangGraph pattern จากประสบการณ์ทีม
- **Decision:** FastAPI + LangGraph StateGraph; BFF คุยกับ backend ด้วย Bearer token + trusted headers (`x-solven-principal/tenant/role`)
- **Consequences:** สองภาษา (TS+Py) แต่แยก concern ชัด; backend deploy แยก (Railway/Docker) (A)

## ADR-003: Clerk + Stripe + Postgres แทน Supabase (deviation จากโจทย์)

- **Context:** โจทย์แนะนำ Supabase (auth+storage+pgvector) แต่ทีมต้องการ: org/multi-tenancy แบบ Clerk Organizations, Stripe billing ที่ BFF, และ Postgres เปล่า (ไม่ผูก vendor)
- **Decision:** Clerk (identity+orgs), Stripe (billing), Postgres 16 ตรง (psycopg3), file ยังไม่มี pipeline (defer)
- **Consequences:** ต้อง implement RLS-equivalent เองที่ application layer (org_id scoping + ownership checks + tests) — ทำแล้ว; เสีย Supabase Storage/Realtime แต่ยังไม่จำเป็นใน MVP (A)

## ADR-004: SQL-first, ไม่มี ORM

- **Context:** โค้ดเดิม sqlite3 raw SQL → ย้าย Postgres
- **Decision:** psycopg3 sync + raw SQL + numbered migrations (`00N_*.sql`) + tracker table — คง style เดิม
- **Consequences:** verbose เล็กน้อย แต่ audit/ownership ตรวจง่าย, ไม่มี ORM magic, test ครบทุก store method (A)

## ADR-005: Frontend minimal-deps (deviation: ไม่ใช้ TanStack Query/Zustand/Zod/RHF/shadcn)

- **Context:** นโยบายตาม plan pro-ui-redesign: "ห้ามเพิ่ม dependency นอกเหนือ tailwind/postcss/motion — ห้าม radix/base-ui/vitest/axios" เพื่อคุมความเสี่ยง dependency ชนกันใน hackathon
- **Decision:** Custom components (Button/Drawer/Toast/CommandPalette), fetch ตรง + AbortSignal, localStorage + IndexedDB
- **Consequences:** โค้ด UI มากขึ้น แต่ bundle เล็ก (First Load 87.3 kB), อัปเกรดง่าย; เพิ่ม TanStack Query ได้ภายหลังถ้าจำเป็น (A)

## ADR-006: ไม่มี RAG/document-ingestion ใน v1 (defer)

- **Context:** Product เป็น teacher copilot (ร่างแผน/ตรวจงาน/รายงาน) ไม่ใช่ document-QA — RAG ไม่เพิ่ม demo value แต่เพิ่มความเสี่ยง pipeline มาก
- **Decision:** Defer embedding/pgvector/chunking/OCR ไปหลัง hackathon; documents.py ปัจจุบัน = PDF export เท่านั้น
- **Consequences:** ปิด gap ตาม spec ข้อ "Document Intelligence" ยังไม่ครบ — ประกาศชัดใน feature-matrix ไม่แอบอ้าง (D)

## ADR-007: Roles MVP = teacher + org roles (owner/admin/teacher) ยังไม่มี student

- **Context:** โจทย์ขั้นต่ำ teacher/student/org_admin แต่ product ครู-first — นักเรียนไม่ใช่ผู้ใช้ direct ใน v1
- **Decision:** Clerk org roles (owner/admin/teacher); student role defer พร้อม student-facing module
- **Consequences:** ตรวจสอบ authorization server-side ครบทุก endpoint; เพิ่ม student role ได้ผ่าน migration เมื่อมี feature นักเรียน (A)

## ADR-008: Human-in-the-loop + guardrail + quarantine (policy หลัก)

- **Context:** AI ห้าม publish เอง; ผลลัพธ์ต้อง editable/reviewable/attributable
- **Decision:** ทุก output เป็น `draft` (pending); guardrail ตรวจ PII/grounding/reminder + retry×2; ถ้ายัง fail จาก provider จริง → `quarantined`; prod fail-closed (provider ล้ม = 502 ไม่ fallback mock)
- **Consequences:** ปลอดภัยสูงสุด; mock fallback มีเฉพาะ demo mode (A)

## ADR-009: Demo mode = build-time constant, fail-open เฉพาะ demo

- **Context:** Demo ต้องรันได้แม้ API/backend ล่ม
- **Decision:** `NEXT_PUBLIC_SOLVEN_MODE=demo` เป็น build-time; เฉพาะโหมดนี้ frontend ถึง fabricate mock draft เมื่อ backend ไม่ถึง; prod ไม่มีทางนี้ (middleware + bffAuth + backend preflight gate)
- **Consequences:** ดีเทอร์มินิสติก 100% ตอน demo; ไม่มีความเสี่ยงหลุด mock ใน prod (A)

## ADR-010: Offline-first PWA + server-wins + idempotent replay

- **Context:** ครูโรงเรียนเล็กเน็ตไม่เสถียร
- **Decision:** Service Worker cache, IndexedDB queue (7d TTL, max 500), `client_task_id` idempotent replay + ownership check (กัน IDOR)
- **Consequences:** ใช้ได้เมื่อเน็ตขาด; conflict = server-wins (A)

## ADR-011: ไม่ใช้ pnpm/Turborepo monorepo (deviation)

- **Context:** โจทย์แนะนำ pnpm+Turborepo; repo มี frontend/ + backend/ สองโปรเจกต์ใน repo เดียว
- **Decision:** npm + สองโฟลเดอร์ตรง ๆ ไม่มี workspaces — ง่ายสุดที่ทำงานได้จริง
- **Consequences:** ต้องรัน install/test แยกโฟลเดอร์; ย้ายเป็น turborepo ได้ภายหลังเมื่อมี packages ร่วม (A)

## ADR-012: ประมวลผล sync ไม่มี queue worker (deviation: ไม่ใช้ Inngest/Trigger.dev)

- **Context:** งาน AI 3 agents ใช้เวลา <60s (timeout 60s provider) — พอสำหรับ MVP; ไม่มี file processing หนัก (defer ตาม ADR-006)
- **Decision:** เรียก sync ผ่าน BFF; offline queue ฝั่ง client รับมือเน็ตขาดแทน queue ฝั่ง server
- **Consequences:** ถ้ามี OCR/embedding หลัง hackathon ต้องเพิ่ม worker (Railway) (A)

## ADR-013: Thai LLM self-host (Typhoon2/SeaLLM) = production target

- **Context:** ต้นทุน × สเกลหมื่นครู + data sovereignty (PDPA §28/29) — proprietary API ไม่ยั่งยืน
- **Decision:** ระหว่าง dev ใช้ Anthropic/OpenAI; หลัง hackathon self-host บน AIS Cloud/EEC ผ่าน vLLM; provider interface ออกแบบให้ swap ได้ (`LLMClient.generate()`)
- **Consequences:** ยังไม่ทำจริง — เป็น target ใน appendix A (D)
