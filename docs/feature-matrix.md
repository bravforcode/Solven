# Feature Matrix — Solven vs JUMP Spec

> P0 = จำเป็นต่อ demo และคุณค่าหลัก · P1 = สำคัญต่อความน่าเชื่อถือ · P2 = หลัง hackathon · P3 = ไม่ทำ
> ✅ ทำแล้ว · 🔶 บางส่วน · ⬜ ยังไม่ทำ (defer ตาม ADR)

## 1. ฟีเจอร์หลักครู (REQUIRED TEACHER FEATURES)

| ฟีเจอร์ | P | สถานะ | หลักฐาน |
|---|---|---|---|
| Teacher dashboard | P0 | ✅ | page.tsx — 7-day activity, agent strip, stats |
| Class management | P0 | 🔶 | SchoolInfo (localStorage) + demo data; ยังไม่มี roster DB จริง |
| Student list | P1 | ⬜ | defer — ไม่เก็บข้อมูลนักเรียนจริง (PDPA) |
| Lesson-plan generation | P0 | ✅ | `lesson-plan` agent + LangGraph + draft review |
| Worksheet generation | P0 | ✅ | Document Studio — worksheet HTML→print/PDF (manual fill) |
| Quiz generation | P1 | ⬜ | defer — ไม่ใช่ demo core |
| AI-assisted grading | P0 | ✅ | `grading` agent + rubric บังคับ + score schema check |
| Document upload | P1 | ⬜ | defer ตาม ADR-006 (text paste แทน) |
| Ask questions about teaching documents | P2 | ⬜ | defer (ต้อง RAG) |
| Learning progress | P2 | ⬜ | defer |
| Export PDF | P0 | ✅ | reportlab + NotoSansThai (glyph test ผ่าน) |
| Export DOCX | P2 | ⬜ | — |
| Save/reuse templates | P1 | ✅ | rubric presets (localStorage) |
| Edit AI output before publishing | P0 | ✅ | draft → review → approve/reject + edit |
| Search and history | P1 | ✅ | queue filter + search + audit endpoint |
| Thai-language support | P0 | ✅ | Thai-first ทุกหน้า |
| Accessibility settings | P2 | 🔶 | aria ครบ; font-size/high-contrast/TTS defer |
| Demo seed data | P0 | ✅ | `POST /api/demo/seed` 10 drafts ทุกสถานะ (idempotent) |

## 2. AI Architecture

| ข้อ | P | สถานะ | หมายเหตุ |
|---|---|---|---|
| Provider abstraction | P0 | ✅ | `LLMClient` ABC + Mock/Anthropic/OpenAI/Gemini/Groq/OpenRouter/auto |
| Gemini/Groq/OpenRouter adapter | P1 | ✅ | Gemini generateContent; Groq/OpenRouter = OpenAI-compatible base |
| Streaming | P1 | ⬜ | — |
| Structured output (schema-validate) | P1 | 🔶 | guardrail regex + score format check; ยังไม่ Pydantic-parse เต็ม |
| Timeout / retry | P0 | ✅ | timeout 60s; provider retry×2 + backoff (4xx ไม่ retry); guardrail retry×2 |
| Rate limiting | P0 | ✅ | per-IP 60/min (in-memory) |
| Usage logging | P0 | ✅ | agent_runs: model/hash/latency/status + **input/output tokens** (migration 004) |
| Mock provider | P0 | ✅ | deterministic Thai |
| Provider error normalization | P1 | ✅ | fail-closed 502 + fallback-mock (dev only); connect/timeout/HTTP ปกติทั้งหมด |

## 3. Safety & Education Quality

| ข้อ | สถานะ |
|---|---|
| Human-in-the-loop (ไม่ auto-publish) | ✅ quarantine + pending-only |
| Thai ตามคำขอ | ✅ Thai-first |
| ระบุความไม่แน่นอน / ไม่ฟันธง | ✅ "(ร่าง ตรวจทานก่อนใช้งาน)" ทุก output + guardrail บังคับ |
| ไม่เปิดเผยข้อมูลนักเรียน | ✅ PII redaction ก่อนส่ง external provider |
| Refuse unsafe / prompt injection | ✅ delimiter + instruction hierarchy + retry |
| Source citation (RAG) | ⬜ defer (ไม่มี RAG) |
| Teacher override เก็บแยก | 🔶 reviewed_by/reviewed_at เก็บ; edit history ⬜ |

## 4. Security (SEC-C/H ครบตาม audit 13 ส.ค.)

| ข้อ | สถานะ |
|---|---|
| Auth | ✅ Clerk (BFF) + Bearer (backend) + production gates |
| Multi-tenant isolation | ✅ org_id scoping + ownership + tests |
| Row-level security | 🔶 app-layer (ไม่มี Supabase RLS — ADR-003) |
| Signed URLs | ⬜ ยังไม่มี file storage |
| Input validation | ✅ Pydantic + Zod-equivalent + caps |
| Rate limit / secure headers / CSRF | ✅ middleware + CORS + token |
| Audit logs | ✅ agent_runs + org/billing events |
| Retention | ✅ 180 วัน purge + scoped delete |

## 5. Testing & Observability

| ข้อ | P | สถานะ |
|---|---|---|
| Unit (schema/permission/prompt/parser) | P0 | ✅ 146 pytest (backend) + 36 Vitest (frontend lib) |
| Integration (auth/isolation/upload/audit) | P0 | ✅ test_tenant/test_billing/test_orgs |
| E2E (Playwright) | P1 | ✅ 4 smoke tests (demo mode, CI) — workflow create→approve→docs |
| Sentry | P1 | ⬜ |
| Structured logs + request-id | P0 | ✅ |
| AI latency/token | P1 | ✅ latency + input/output tokens ใน agent_runs |

## 6. Deployment

| ข้อ | สถานะ |
|---|---|
| Vercel (web) | ✅ live: solven.vercel.app |
| Backend host | ✅ Railway-ready Dockerfile + compose |
| Env validation | ✅ preflight production gates |
| Health check | ✅ /health + /readyz (DB probe) |
| Rollback / prod checklist | ✅ DEPLOYMENT.md |
| Worker service | ⬜ defer (ADR-012) |
