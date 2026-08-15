# Demo Data — Solven

## แหล่งข้อมูล

- **Seed endpoint:** `POST /api/demo/seed` (dev/demo เท่านั้น — hard 404 ใน production)
- **ที่มา:** `backend/app/seed.py` — ดีเทอร์มินิสติก 100%, idempotent (id คงที่ demo-001..010, re-seed = replace)
- **หลักการ PDPA:** ทุก record เป็นข้อมูลสังเคราะห์ชัดเจน ไม่มีชื่อ/ข้อมูลนักเรียนจริง

## เนื้อหา seed (10 drafts ครบทุกสถานะ)

| # | Agent | สถานะ | จุดประสงค์ใน demo |
|---|---|---|---|
| 1 | grading | pending | ตรวจงานทั่วไป (รออนุมัติ) |
| 2 | grading | pending | ตรวจงานทั่วไป |
| 3 | grading | approved | แสดงงานที่ครูอนุมัติแล้ว |
| 4 | grading | rejected | แสดงงานที่ครูแก้/ปฏิเสธ |
| 5 | grading | **quarantined** | โชว์ guardrail จับเบอร์โทรในผลลัพธ์ |
| 6 | lesson-plan | pending | แผนการสอนคณิต ป.5 |
| 7 | lesson-plan | approved | แผนวิทยาศาสตร์ ป.4 |
| 8 | reporting | pending | ร่างข้อความถึงผู้ปกครอง |
| 9 | reporting | rejected | ร่างที่ครูไม่ใช้ |
| 10 | reporting | **quarantined** | โชว์ guardrail จับอีเมลในผลลัพธ์ |

ทุก draft มี `tasks` + `agent_runs` (audit) ครบคู่ — กราฟ activity 7 วันใน dashboard อิงจาก `created_at` ที่กระจาย 0-2.5 วัน

## ข้อมูลโรงเรียน (Document Studio)

`frontend/lib/school.ts` — `SCHOOL_DEFAULTS`: ชื่อโรงเรียนตัวอย่าง/อำเภอ/จังหวัด/ผู้อำนวยการ — ครูแก้ได้ที่ /settings → ใช้ทุก template (จดหมาย/เกียรติบัตร/บันทึก)

## Rubric presets (grading)

เก็บ localStorage `solven.rubricPresets` — ตัวอย่างเกณฑ์ตรวจ เช่น "ความถูกต้อง 4 คะแนน / การแสดงวิธีทำ 4 คะแนน / การใช้ภาษา 2 คะแนน"

## วิธี reset

- กดปุ่ม Demo seed ใน UI (เรียก endpoint) → re-seed id เดิม ไม่ duplicate
- ล้างทั้งหมด: ลบ localStorage + truncate ตาราง tasks/drafts/agent_runs (dev เท่านั้น)

## ข้อจำกัด (เปิดเผย)

- Seed ใช้ id แบบ global (demo-*) → ใช้ได้เฉพาะ single-tenant demo — endpoint ถูกปิดใน production อยู่แล้ว
- Mock LLM output เป็น text คงที่ — ไม่แสดงความฉลาดของโมเดลจริง; ใช้โชว์ workflow เท่านั้น
