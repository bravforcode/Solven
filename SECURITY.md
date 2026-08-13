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
| Frontend CSP | `script-src 'self' 'unsafe-inline'` (+`'unsafe-eval'` ใน dev) — **Next.js App Router ส่ง RSC hydration payload เป็น inline script; ถ้าไม่มี `unsafe-inline` React จะไม่ hydrate เลย (หน้า render แต่ทุกปุ่มตาย) — จำเป็นต้องมีเพื่อให้แอปทำงาน** · hardening อนาคต: nonce-based CSP (ดู `next.config.js` comment) |
| Rate limiting | per-IP fixed window (ในหน่วยความจำ — ใช้ Redis เมื่อ scale) |
| Input validation | Pydantic strict types + length limits (`input ≤ 50,000` chars) |
| Audit | ทุก agent call บันทึกใน `agent_runs` (model, hashes, latency, guardrail result) + `X-Request-ID` ทุก request |
| Guardrail | ตรวจ PII (เบอร์โทร/บัตรประชาชน/อีเมล), grounding ตัวเลข, เตือน human-in-the-loop |
| PDPA | ข้อมูลนักเรียน pseudonymized; เด็ก <20 ปี ต้องได้รับความยินยอมจากผู้ปกครอง (§20) — ระบบออกแบบให้โฮสต์ในไทย (AIS Cloud/EEC) เป็นตัวเลือก data sovereignty (PDPA อนุญาต cross-border ตาม §28/29) — **ห้ามใส่ข้อมูลจริงใน repo/env ทดสอบ** |

## ขอบเขตการรองรับ

- แจ้งช่องโหว่ที่กระทบข้อมูลนักเรียน/ครู หรือ auth → ตอบสนองภายใน 72 ชม.
- ช่องโหว่ระดับ demo/UX → ภายใน 7 วันทำการ
