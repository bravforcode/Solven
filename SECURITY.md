# Security Policy — Solven

## Reporting a vulnerability

ส่งรายงานไปที่: **เปิด issue ใน repo นี้** (ระบุ `[SECURITY]` ในหัวข้อ) หรือติดต่อผู้ดูแลโดยตรง
ห้ามเปิดเผยช่องโหว่ใน public issue ก่อนได้รับการแก้ไข (responsible disclosure)

## Security posture (โดยสังเขป)

| ด้าน | สถานะ |
|---|---|
| Auth | Bearer token บนทุก `/api/*` (`app/security.py`) — พร้อมเปลี่ยนเป็น OIDC/JWT |
| Transport | กำหนด TLS ที่ reverse proxy; frontend ส่ง Security Headers (CSP, X-Frame-Options, nosniff ฯลฯ) ผ่าน `next.config.js` |
| Backend headers | `x-content-type-options`, `x-frame-options`, `referrer-policy`, CSP, `permissions-policy` ทุก response (`app/middleware.py`) |
| Rate limiting | per-IP fixed window (ในหน่วยความจำ — ใช้ Redis เมื่อ scale) |
| Input validation | Pydantic strict types + length limits (`input ≤ 50,000` chars) |
| Audit | ทุก agent call บันทึกใน `agent_runs` (model, hashes, latency, guardrail result) + `X-Request-ID` ทุก request |
| Guardrail | ตรวจ PII (เบอร์โทร/บัตรประชาชน/อีเมล), grounding ตัวเลข, เตือน human-in-the-loop |
| PDPA | ข้อมูลนักเรียน pseudonymized; ระบบออกแบบให้โฮสต์ในไทย (AIS Cloud/EEC) — **ห้ามใส่ข้อมูลจริงใน repo/env ทดสอบ** |

## ขอบเขตการรองรับ

- แจ้งช่องโหว่ที่กระทบข้อมูลนักเรียน/ครู หรือ auth → ตอบสนองภายใน 72 ชม.
- ช่องโหว่ระดับ demo/UX → ภายใน 7 วันทำการ
