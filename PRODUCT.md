# PRODUCT.md — Solven

**One-liner:** ผู้ช่วยครูแบบ multi-agent (Solven) ที่ทำงานธุรการกินเวลา — ตรวจงาน ร่างแผนการสอน ร่างรายงาน/ข้อความหาผู้ปกครอง — โดยครูอนุมัติทุกผลลัพธ์ก่อนใช้งาน

**Built for:** JUMP THAILAND Hackathon 2026 (AIS) — theme "AI for the Future of Thai Education", challenge "Empowering Teachers" (deadline สมัคร 16 ส.ค. 2569)

## Problem
- PISA 2022 คณิตฯ ไทย = 394 (OECD, ยืนยันแล้ว) ลดลงจาก 419 (2018) — ผลการเรียนรู้ถดถอย + เหลื่อมล้ำ
- ต้นตอเชิงโครงสร้าง: ครูไม่ครบชั้นในโรงเรียนขนาดเล็ก (TDRI: ~12,000 โรง) → ครู 1 คนแบกสอนหลายวิชา/หลายชั้น + งานธุรการ
- ผล: ครูไม่มีเวลาเตรียมสอน/ดูแลรายบุคคล งานธุรการทับซ้อนการสอน

## Users
- หลัก: ครูสพฐ. ในโรงเรียนขนาดเล็ก (<120 คน) พื้นที่ชนบท เน็ตมือถือหลัก ต้องการเครื่องมือง่าย ๆ บนมือถือ ไม่ต้องอบรม
- รอง: ผู้บริหารสถานศึกษา/เขตพื้นที่ (ผู้รับรายงาน)

## Solution
Coordinator + 3 sub-agents (Grading & Feedback / Lesson-Plan / Reporting & Communication) + guardrail agent; human-in-the-loop ทุกผลลัพธ์; audit log ทุก agent call; ข้อมูลอยู่ในไทย (AIS Cloud/EEC, PDPA); offline-first PWA; LLM เปิดทาง self-host Thai model (Typhoon2/SeaLLM) เพื่อต้นทุนต่ำ + data sovereignty

## Mode (ต่อ surface)
- Prototype UI (web app สำหรับครู): **Operate** — ใช้งานจริง ต้อง scanability + human-in-the-loop queue ชัดเจน
- Presentation PDF: **Persuade** — พิชิตกรรมการ hackathon

## Constraints
- Deadline 16 ส.ค. 2569 — ต้องยื่นเอกสาร+PDF+repo ภายใน 4 วัน
- ต้องซื่อสัตย์กับสถานะ implementation (prototype = mock agents จริง; backend กำลังทำ)
- ไม่มีข้อมูลครู/นักเรียนจริงใน repo (PDPA) — ใช้ตัวอย่างสมมติใน demo

## Non-goals (ตอนนี้)
- ไม่ทำ autonomous grading/ส่งข้อความอัตโนมัติโดยไม่มีครูอนุมัติ
- ไม่ทำระบบ e-commerce/บิลลิง
- ไม่ทำ native mobile app (PWA ก่อน)
