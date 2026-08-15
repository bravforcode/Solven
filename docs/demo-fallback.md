# Demo Fallback Plan — Solven

> หลักการ: **demo ต้องรันได้เสมอ** แม้ส่วนประกอบล้ม — ออกแบบ fail-safe เป็นชั้น ๆ

## Layer 1 — LLM provider ล่ม/ไม่มี API key

| โหมด | พฤติกรรม |
|---|---|
| `NEXT_PUBLIC_SOLVEN_MODE=demo` | ใช้ **MockLLM deterministic** (backend) หรือ local mock (frontend ถ้า backend ไม่ถึง) — ทำงานเต็ม workflow |
| production | **Fail closed** — 502 แสดง error ตรง ๆ ไม่ fabricate ผลลัพธ์ (policy ไม่มีข้อยกเว้น) |

**บนเวที:** รัน demo mode เสมอ → ไม่มี dependency กับ OpenAI/Anthropic เลย

## Layer 2 — Backend ล่ม/เน็ตหลุด

1. **Frontend demo mode** → fabricate draft ในเครื่อง (mock + warning "รันด้วย mock ในเครื่อง") — หน้าเว็บยังทำงาน
2. **Queue offline** → งานถูกเก็บ IndexedDB (7 วัน) → flush อัตโนมัติเมื่อกลับมาออนไลน์ + idempotent replay (client_task_id)
3. **UI offline banner** → แสดงสถานะชัดเจน ไม่เงียบ

**บนเวที:** ถ้า backend ล่ม ให้สลับไปโชว์ offline-first flow แทน (เป็นฟีเจอร์เด่นอยู่แล้ว)

## Layer 3 — เน็ตเวทีแย่/ช้า

- PWA: หน้าเว็บ cache ใน Service Worker (network-first shell) — โหลดซ้ำไม่ต้องยิง server
- Backend timeout 60s + BFF timeout 30s — ไม่ค้างคารา
- กดสร้างซ้ำปลอดภัย (idempotent — ไม่ duplicate draft)

## Layer 4 — ข้อมูล demo หาย/เพี้ยน

- กดปุ่ม **Demo seed** re-seed id เดิม (replace ไม่ duplicate) — กลับมาเหมือนเดิมทุกครั้ง
- Reset ข้อมูลเครื่อง: ล้าง localStorage → profile/school กลับค่า default

## สิ่งที่ห้ามทำบนเวที (เพื่อความปลอดภัย)

- ❌ ห้ามสลับ production mode หน้างาน (mock ถูก gate ปิด — จะเจอจอดำ/502)
- ❌ ห้ามโชว์ด้วยข้อมูลนักเรียนจริง (PDPA + demo data policy)
- ❌ ห้ามแก้ DB มือบนเวที (ใช้ seed endpoint เท่านั้น)

## Pre-flight checklist 30 นาทีก่อนขึ้นเวที

- [ ] Deploy ล่าสุดออนไลน์ + /health 200 + /readyz 200
- [ ] Demo seed เรียกแล้ว — 10 drafts เห็นใน queue
- [ ] ทดสอบ flow ครบ 1 รอบ: create → edit → approve → document → PDF
- [ ] PDF ฟอนต์ไทยไม่เพี้ยน (download + เปิดดูจริง)
- [ ] มือถือสำรองเปิดหน้าเว็บค้างไว้ (fallback เครื่องแสดง)
- [ ] เตรียมสไลด์ architecture ไว้สลับถ้า live ล่ม (docs/presentation/)
