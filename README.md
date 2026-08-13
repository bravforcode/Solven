# Solven

Multi-agent AI system that gives Thai teachers their time back — automates grading, lesson planning, and parent/admin communication so teachers can focus on teaching.

Built for **JUMP THAILAND Hackathon 2026** (AIS) — theme: *AI for the Future of Thai Education*, challenge: *Empowering Teachers*.

## Problem

Thai learning outcomes are declining and unequally distributed: PISA 2022 mathematics score for Thailand = **394** (OECD), down from 419 in 2018. A major structural driver is teacher shortage and misallocation in small schools (TDRI research) — teachers in understaffed schools carry a disproportionate load of admin/grading work instead of instruction (OECD TALIS). World Bank (2015) evidence shows restoring teacher time directly lifts student achievement.

## Solution

Solven is a coordinator + 3 sub-agent system, designed to plug into the existing **AIS LearnDi (AIS Academy)** platform rather than ship as a standalone app:

| Agent | Responsibility |
|---|---|
| **Coordinator** | Routes tasks, manages context/state across sub-agents, enforces human-in-the-loop checkpoints |
| **Grading & Feedback** | Auto-grades assignments, drafts per-student feedback for teacher review |
| **Lesson-Plan** | Generates/adapts lesson plans against curriculum targets |
| **Reporting & Communication** | Drafts parent/admin reports and updates |

All agent output is draft-only until a teacher approves — no fully autonomous grading or messaging.

## Status (honest)

| Layer | Now | Next |
|---|---|---|
| Web UI | Working prototype — Next.js 14 (App Router, TS) + coordinator route + 3 agents + approve/reject review queue + PWA manifest/SW; falls back to local mock if backend is down | Offline-first hardening, real-world pilot |
| Backend | Working — Python FastAPI + LangGraph coordinator, 3 sub-agents, rule-based guardrail, SQLite audit log (`agent_runs`), LLM client with API/mock fallback, test suite green in CI (see below) | Thai open-source LLM self-host (target: Typhoon2), auth/RBAC |
| Docs | Problem brief + pitch-deck (10-slide PDF + generator) + target architecture (`docs/`) | — |

The full production-grade target architecture is described in [docs/appendix-a-architecture.md](docs/appendix-a-architecture.md) — everything in the app entry is a *working prototype* of that target, with mock agent outputs until the backend is wired.

## Tech Stack

- **Frontend:** Next.js (App Router) + TypeScript
- **Backend:** Python FastAPI + LangGraph (coordinator orchestration), SQLite
- **LLMs:** configurable — Anthropic/OpenAI API now; Thai open-source models for scale (see Appendix A)
- **Integration target:** AIS LearnDi / AIS Cloud (AIS EEC) — data residency in Thailand (PDPA)

## Repo Layout

```
frontend/            Next.js + TypeScript UI (working prototype)
backend/             FastAPI + LangGraph services (in progress)
docs/                problem brief, pitch-deck outline, target architecture
```

## Getting Started

```bash
# backend
cd backend
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
python -m app.migrate                 # schema + migrations
SOLVEN_LLM=mock uvicorn app.main:app --reload --port 8000

# frontend (อีกระบบปฏิบัติการ/terminal)
cd frontend
npm install
npm run dev          # http://localhost:3000
```

> API ทุกตัวของ backend ต้องใช้ Bearer token (`SOLVEN_API_TOKEN`) — ดู `backend/.env.example`
> และ `docs/DEPLOYMENT.md` สำหรับ production runbook · `docker compose up --build` สำหรับ pilot

## UI features (Pro UI redesign — 14 Aug 2026)

Tailwind v4 + shadcn-style tokens บน Stripe grammar เดิม (ค่า token ไม่เปลี่ยน) + ฟีเจอร์ความอำนวยสะดวก:

- **Batch approve/reject** — เลือกหลายร่างในคิว (checkbox + select-all เฉพาะรายการที่แสดง) → อนุมัติ/ปฏิเสธทีเดียว; กด "เลิกทำ" ใน toast 5 วินาทีเพื่อย้อนกลับเป็นรออนุมัติ
- **Command palette** — กด `⌘K` / `Ctrl+K` (หรือปุ่ม ⌘K ในแถบบน) ค้นหาแล้วไปสร้างงาน/คิวตรวจ/กรองสถานะ/ล้างตัวกรอง/โหลดตัวอย่าง
- **Confirm dialogs** — ยืนยันก่อนปฏิเสธร่างที่มีคำเตือน, ปฏิเสธเป็นชุด, และลบ rubric preset
- **Bottom drawer (มือถือ)** — แตะเนื้อหาร่างบนจอเล็ก → แผงเลื่อนขึ้นรีวิว + อนุมัติ/คัดลอก/ดาวน์โหลด; ปัดลงเพื่อปิด
- **Sort + result count** — เรียงใหม่สุด/เก่าสุด/งาน A-Z; "แสดง X จาก Y รายการ" อัปเดตตามตัวกรอง
- **Keyboard shortcuts (desktop)** — `1` สร้างงาน · `2` คิวตรวจ · `n` สร้างงาน · `/` ค้นหา · `c` โฟกัสคำตอบ · `Esc` ปิด overlays (ข้ามเมื่อพิมพ์ในฟอร์ม)
- **Stateful buttons** — spinner + `aria-busy` ขณะ submit/อนุมัติ; flash เขียว 800ms เมื่อสำเร็จ
- A11y: focus trap + scroll lock บน dialog/drawer/palette, `aria-activedescendant` ใน palette, `role="status"` bulk bar, `prefers-reduced-motion` ทุก animation

## Production readiness

- ✅ Auth (Bearer), rate limiting, security headers, request IDs, structured logging
- ✅ Config ทั้งหมดผ่าน env (`SOLVEN_*`), migrations runner (`app/migrate.py`), input limits
- ✅ CI (`pytest` 32 tests + lint/typecheck/build), Docker + docker-compose
- ✅ Offline-first: IndexedDB queue + Background Sync + auto-flush on reconnect (Appendix A.8)
- ✅ PWA: manifest + maskable icons + service worker; SEO: metadata/JSON-LD/sitemap/robots/OG
- 📖 [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) · [SECURITY.md](SECURITY.md)

### Launch checklist (ก่อนเปิดใช้งานจริง)

1. `NEXT_PUBLIC_SITE_URL` = domain จริง (ไฟล์ `frontend/.env.local`) — ตอนนี้เป็น placeholder
2. `SOLVEN_API_TOKEN` = random ≥32 chars ทั้ง backend และ frontend (secret manager)
3. Deploy ตาม `docs/DEPLOYMENT.md` — TLS, CORS origins จริง, `python -m app.migrate`
4. ตรวจสอบตัวเลข/ข้อมูลใน `docs/jump-2026-application.md` (PISA/TDRI อ้างอิง) ก่อนส่งประกวด
5. ทดสอบ E2E กับ pilot กลุ่มเล็ก (10-20 ครู) ก่อน scale
