# Repository Audit — Solven

> จัดทำ 15 ส.ค. 2569 · สถานะหลัง merge `feat/solven-auth-org-billing` เข้า `feat/pro-ui-redesign` (commit `1a38e93`)

## 1. แหล่งอ้างอิง (Source Repository Policy)

โจทย์กำหนดให้ใช้ 3 repos เป็น reference:

| Repo | ผลการตัดสินใจ | เหตุผล |
|---|---|---|
| nextjs/saas-starter | ❌ ไม่ fork | มี Stripe/billing/multi-tenancy เต็มชุด — เกินความจำเป็นและ dependency ชนกัน; Solven สร้างเองทั้งหมด |
| vercel/chatbot | ❌ ไม่ fork | เน้น chat experience; Solven เป็น workflow ของครู (ร่าง → ตรวจ → อนุมัติ) ไม่ใช่ chat |
| supabase/nextjs-vector-search | ❌ ไม่ใช้ | เป็น reference RAG เท่านั้น — RAG ถูก defer ไปหลัง hackathon (ADR-006) |

**ผลลัพธ์:** โค้ด 100% เขียนเอง ไม่มี copy-paste จาก repo ภายนอก → ไม่มี license/collision risk

## 2. Stack จริง (verified จาก package.json / requirements.txt)

| Layer | เทคโนโลยี | เวอร์ชัน |
|---|---|---|
| Frontend | Next.js (App Router) | 14.2.35 |
| | React / TypeScript | 18.3.1 / 5.5.4 |
| | Tailwind CSS | ^4.3.3 |
| | Auth / Billing | @clerk/nextjs v6 / stripe |
| Backend | Python / FastAPI | 3.12 / 0.141.1 |
| | LangGraph | 1.2.11 |
| | psycopg3 (Postgres 16) | 3.3.4 |
| | reportlab (PDF Thai) | 4.4.4 |
| DB | PostgreSQL 16 (docker compose + Railway) | — |
| Tests | pytest 9.1.1 (146 tests) · CI: GitHub Actions | — |

## 3. Dependency Audit

- **Backend:** `requirements.txt` exact-pinned 12 รายการ (`pip check` clean) — ล็อกไว้ตาม audit 13 ส.ค.
- **Frontend:** 381 packages (npm ci) · `npm audit` ไม่มี critical ใน dependency ตรง; transitive deprecations ที่พบ: `crypto-js@4.2.0` (transitive ของ Clerk, ไม่มี CVE กระทบ), `glob@10.3.10`, `eslint@8.57.1` (EOL — ยกเลิกใน audit T1-12 เดิม: อัปเกรดต้อง next@15 major → defer)
- **Secrets:** ไม่มี key จริงใน repo — ตรวจ null-byte scan + git history แล้ว (audit 13 ส.ค.)

## 4. สิ่งที่ Audit 13-15 ส.ค. พบและจัดการแล้ว

ดู `docs/audits/2026-08-13/03_remediation_status.md` — Critical 6 ตัว (CORS, webhook import, Telegram, PII, IDOR, replay) ปิดทั้งหมดพร้อม test

## 5. Known Gaps (เปิดเผยตามหลัก honest engineering)

| Gap | ความเสี่ยง | แผน |
|---|---|---|
| LLM: ไม่มี Gemini/Groq/OpenRouter adapter, ไม่มี streaming/structured-output | Medium | Plan B (ADR-008) |
| ไม่มี RAG/document-ingestion | ไม่กระทบ demo | ADR-006 defer |
| ไม่มี frontend behavioral tests (Vitest/Playwright) | Medium | workstream นี้ |
| Next 14 (advisories ต้องอัป next@15) | Low-Medium | แยก branch + browser regression หลัง hackathon |
| Rate-limit in-memory (ไม่รองรับ multi-instance) | Low (pilot) | Redis เมื่อ scale |
