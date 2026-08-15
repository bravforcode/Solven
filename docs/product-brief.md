# Product Brief — Solven

> ฉบับเต็ม: [`PRODUCT.md`](../PRODUCT.md) · ใบสมัคร: `docs/jump-2026-application.md`

## หนึ่งบรรทัด

**Solven** = ผู้ช่วยครูแบบ multi-agent ที่ทำงานธุรการซ้ำซากแทนครู (ตรวจงาน / แผนการสอน / รายงาน) โดยครูเป็นผู้อนุมัติผลลัพธ์สุดท้ายเสมอ — คืนเวลาให้ครูได้สอน

## ปัญหา

- PISA 2022 คณิตไทย 394 (ลดจาก 419 ใน 2018)
- โรงเล็ก 15,089 แห่ง (~50% สพฐ.) ครูไม่ครบชั้น ~12,000 แห่ง ขาดครู ~43,000 คน
- ครู 1 คนสอนหลายวิชา/ชั้น → งานธุรการทับเวลาสอน (เทียบ TALIS 2013: ครูใช้เวลา 29% กับงานธุรการ)

## โซลูชัน — 3 โมดูล + workflow ครู

1. **Grading & Feedback** — ตรวจงานตาม rubric ที่ครูกำหนดเอง ให้คะแนน+feedback รายคนภาษาไทย
2. **Lesson-Plan** — ร่างแผนตามบริบทจริง (ชั้น/จำนวนนักเรียน/เวลา/คละชั้น)
3. **Reporting** — สรุปรายงานผู้บริหาร + ร่างข้อความผู้ปกครอง

ทั้งหมดจบที่ **review queue**: ร่าง → ครูแก้ → อนุมัติ/ปฏิเสธ → ออกเอกสารจริง (Document Studio → PDF ฟอนต์ไทย)

## กลุ่มเป้าหมาย

ครูสพฐ. โรงเล็ก (<120 คน) ครูไม่ครบชั้น — เน้นมือถือ เน็ต 4G ไม่เสถียร → PWA offline-first

## Differentiation (ไม่ใช่ chatbot)

- Workflow ของครู ไม่ใช่ chat
- Human-in-the-loop + guardrail + quarantine + audit ทุก call
- Offline-first + background sync (server-wins)
- เป้า Thai LLM self-host (ต้นทุน + data sovereignty)
- ช่องทางขยาย: NDLP (K-12 ของรัฐ) + AIS Cloud/EEC
