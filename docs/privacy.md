# Privacy & PDPA — Solven (สรุป)

> รายละเอียดกฎหมาย: `docs/appendix-a-architecture.md` §A.10

## จุดยืน

- **ข้อมูลน้อยที่สุด (data minimization):** เก็บเท่าที่จำเป็น — demo ใช้ข้อมูลสังเคราะห์ 100%, ไม่มีชื่อ/ข้อมูลนักเรียนจริงในระบบ
- **Pseudonymization:** ข้อมูลนักเรียนไม่ถูกเก็บแบบระบุตัวตนใน MVP (ไม่มี student table เลย — ADR-007)
- **Redaction ก่อนออกนอก infra:** ข้อมูลเข้า LLM ถูกตัด PII (เบอร์/บัตร/อีเมล) ก่อนส่ง provider ภายนอก — `app/redact.py` + test

## วงจรชีวิตข้อมูล

| เรื่อง | การดำเนินการ |
|---|---|
| Retention | ลบ drafts/tasks/runs เกิน 180 วัน (config `SOLVEN_RETENTION_DAYS`) — auto purge ตอน start |
| สิทธิขอลบ | `DELETE /api/drafts/{id}` (owner-scoped) |
| Consent | ยังไม่เก็บข้อมูลจริง → ยังไม่มี consent flow; เพิ่มเมื่อมี student module (§20 PDPA สำหรับเด็ก) |
| Cross-border | เป้าหมาย self-host Thai LLM ในไทย (AIS Cloud/EEC) ลดความเสี่ยง §28/29; ระหว่าง dev ใช้ provider ต่างประเทศ + redaction + เปิดเผยใน DEPLOYMENT.md |

## หลักการที่ห้ามละเมิด

1. ไม่ส่งข้อมูลนักเรียนไป provider โดยไม่จำเป็น
2. ไม่เก็บข้อมูลอ่อนไหวใน log (log มี request_id/path/status เท่านั้น)
3. ไม่ใช้ข้อมูลจริงใน environment ทดสอบ
