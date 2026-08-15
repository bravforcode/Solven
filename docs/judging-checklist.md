# Judging Checklist — Solven

> ใช้ตรวจก่อนส่ง + ใช้ตอบกรรมการ — ครบ = พร้อม

## 1. โจทย์ / Problem–Solution Fit

- [x] ปัญหาจริงอ้างข้อมูล: PISA 2022 (394 คณิต), โรงเล็ก 12,000 แห่ง, ครูขาด 43,000 (เอกสารอ้างอิงตรวจแล้ว 12 ส.ค.)
- [x] ตรงธีม AI for the Future of Thai Education
- [x] ไม่ใช่ chatbot ทั่วไป — เป็น workflow ครู (draft→review→approve→document)
- [x] Thai-first ทั้ง UI + output
- [ ] เติมชื่อทีม/ที่ปรึกษาใน `docs/jump-2026-application.md` (ส่วน `[ ]`)

## 2. ฟังก์ชันทำงานจริง (Functioning Prototype)

- [x] Live demo: solven.vercel.app (เปิดดูได้ไม่ต้องติดตั้ง)
- [x] Demo <5 นาที ตาม `docs/demo-script.md`
- [x] Human-in-the-loop: ไม่มี auto-publish, ทุก output รออนุมัติ
- [x] ฟีเจอร์หลักครบ: grading / lesson-plan / reporting + Document Studio + PDF ไทย
- [x] Offline-first (PWA + queue) — ฟีเจอร์เด่นเหนือคู่แข่ง

## 3. ความลึกทางเทคนิค

- [x] Multi-agent orchestration จริง (LangGraph StateGraph, ไม่ใช่ prompt เดียว)
- [x] Guardrail agent + retry + quarantine
- [x] Audit trail ทุก agent call (`agent_runs`)
- [x] Multi-tenant (Clerk orgs) + quota billing (Stripe)
- [x] 146 backend tests + CI
- [x] หลักฐานสถาปัตยกรรม: `docs/appendix-a-architecture.md`

## 4. ความปลอดภัย / PDPA

- [x] PII redaction ก่อนส่ง external LLM
- [x] Retention policy 180 วัน + scoped delete
- [x] Production fail-closed gates (preflight)
- [x] No secrets ใน repo (audit ผ่าน)
- [x] เอกสาร: `docs/security.md`, `docs/privacy.md`, `SECURITY.md`

## 5. การใช้เทคโนโลยี AIS (โจทย์เฉพาะ)

- [x] แผน: AIS Cloud/EEC host backend + Thai LLM self-host (appendix A.1, A.6)
- [x] AIS 5G เป็นฐานกลยุทธ์ offline-first/พื้นที่ห่างไกล (A.8)
- [x] LearnDi วางตำแหน่งถูกต้อง (ไม่ใช่ K-12 — NDLP คือช่องทางจริง, A.12)
- [ ] เช็คลิงก์ "AIS Technology" หน้างานจริงอีกครั้ง

## 6. โมเดลขยายผล (Scalability Story)

- [x] นำร่อง: สพฐ. โรงเล็ก → NDLP (ฐานครู 160,507 คน) → AIS Cloud scale
- [x] ต้นทุน: Thai LLM self-host (Typhoon2/SeaLLM) คุม cost per request
- [x] Evidence table หน้า /about (built vs target ตรงไปตรงมา)

## 7. เอกสารประกอบ (ครบตามข้อกำหนด)

| Doc | สถานะ |
|---|---|
| product-brief.md | [x] |
| architecture.md + appendix-a | [x] |
| repository-audit.md | [x] |
| architecture-decision-record.md | [x] |
| feature-matrix.md | [x] |
| demo-script / demo-data / demo-fallback | [x] |
| security.md / privacy.md | [x] |
| deployment.md (env/rollback/checklist) | [x] |
| judging-checklist.md | [x] (ไฟล์นี้) |

## ก่อนส่งจริง (Day-of)

- [ ] Deploy ล่าสุดบน Vercel + backend online
- [ ] รัน demo script 1 รอบเต็ม
- [ ] ใบสมัคร: ใส่ชื่อทีมจริง + ลิงก์ repo/demo
- [ ] Presentation PDF (docs/presentation/) อัปโหลดตามข้อ 8
