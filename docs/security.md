# Security — Solven (สรุป)

> ฉบับเต็ม: [`SECURITY.md`](../SECURITY.md) · ผล audit: `docs/audits/2026-08-13/04_security_audit.md`

## โมเดลความปลอดภัย (defense-in-depth)

| ชั้น | กลไก |
|---|---|
| Edge/BFF | Clerk auth (middleware) → principal ที่ verify แล้วส่ง backend ด้วย trusted headers; client header ถูก strip |
| Backend auth | Bearer token (`hmac.compare_digest`) + production gates (token ≥32 chars, no default) |
| Authorization | ทุก mutation ตรวจ principal + org ownership (server-side, ไม่ใช้ UI hiding) |
| Multi-tenant | org_id scoping บน tasks/drafts/agent_runs + cross-org tests |
| Input | Pydantic validation + caps (input 50k, payload 200k/1MB) |
| Output | guardrail: PII (เบอร์/บัตร/อีเมล), grounding (score ต้องมีใน input), human-in-the-loop reminder; fail → retry×2 → quarantine |
| LLM boundary | PII redaction ก่อนส่ง external provider; mock path ไม่ผ่าน redaction (local) |
| Transport | CORS allowlist, security headers (CSP/nosniff/frame-ancestors), rate limit 60/min/IP |
| Data | Retention purge 180 วัน + scoped delete (PDPA data-rights); no secrets ใน repo |
| Ops | /readyz DB probe, preflight fail-closed, JSON logs + request-id, docs ปิดใน prod |

## Known limits (เปิดเผย)

- Rate limit in-memory (multi-instance ต้อง Redis) — DEPLOYMENT.md
- ไม่มี signed URLs (ยังไม่มี file storage)
- Next 14 advisories → อัป next@15 หลัง hackathon
