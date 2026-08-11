# Deploying Solven — production runbook

> ระดับ production สำหรับ deployment จริง — โปรดอ่านให้ครบก่อนขึ้นระบบ

## 1. สิ่งที่ต้องรู้ก่อน deploy

- **ทุก `/api/*` ของ backend ต้องมี Bearer token** (`SOLVEN_API_TOKEN`) — `/health` เปิดสาธารณะเท่านั้น
- **ข้อมูลนักเรียนเป็นข้อมูลอ่อนไหว (PDPA)** — ระบบต้องอยู่ใน data center ไทย (เป้า: AIS Cloud/EEC) และห้ามมีข้อมูลจริงใน environment ทดสอบ
- LLM: `SOLVEN_LLM=mock|anthropic|openai` — สเกลจริงใช้ open-source Thai model self-host (ดู Appendix A.6)
- DB: SQLite เหมาะกับ pilot; ก่อน scale ต้องย้าย PostgreSQL (ดู Appendix A.7)

## 2. Deployment ตัวเลือก

### 2a. Docker Compose (เร็วสุด — pilot/demo)

```bash
cp backend/.env.example backend/.env   # แก้ SOLVEN_API_TOKEN ก่อน!
export SOLVEN_API_TOKEN="$(openssl rand -hex 32)"
docker compose up --build -d
# frontend: http://localhost:3000 · backend: http://localhost:8000
```

### 2b. แยก service (production จริง)

```bash
# backend
cd backend
python -m venv .venv && .venv\Scripts\activate   # Windows
pip install -r requirements.txt
python -m app.migrate                            # schema + migrations
SOLVEN_API_TOKEN=<secret> SOLVEN_LLM=mock uvicorn app.main:app --host 0.0.0.0 --port 8000
# หลาย worker/process ต้องมี reverse proxy + Redis rate limiter (ดูข้อ 4)

# frontend (build แล้ว serve ด้วย Next standalone หรือ Vercel)
cd frontend
npm ci && npm run build
NEXT_PUBLIC_SOLVEN_API_URL=https://api.example.com \
SOLVEN_API_TOKEN=<secret> \
npm run start
```

## 3. ตัวแปร environment (ทั้งหมด)

| ตัวแปร | บังคับ | ค่าเริ่มต้น | คำอธิบาย |
|---|---|---|---|
| `SOLVEN_API_TOKEN` | ✅ prod | dev-secret-change-me | Bearer token ของ backend — **เปลี่ยนเสมอ** |
| `SOLVEN_RATE_LIMIT_PER_MIN` | – | 60 | requests/IP/min (ในหน่วยความจำ — เปลี่ยนเป็น Redis เมื่อหลาย instance) |
| `SOLVEN_CORS_ORIGINS` | – | http://localhost:3000 | origin ที่ browser เรียกได้ (comma-separated) |
| `SOLVEN_DB_PATH` | – | backend/data/solven.db | path ฐานข้อมูล |
| `SOLVEN_LLM` | – | auto | mock / anthropic / openai |
| `ANTHROPIC_API_KEY` / `OPENAI_API_KEY` | ตาม LLM | – | key ของ provider |
| `NEXT_PUBLIC_SOLVEN_API_URL` (frontend) | ✅ | localhost:8000 | URL backend จากมุมมอง Next.js server |
| `SOLVEN_API_TOKEN` (frontend) | ✅ | – | token ส่งต่อจาก Next.js server → backend (ไม่รั่วถึง browser) |

## 4. Checklist ก่อน production

- [ ] `SOLVEN_API_TOKEN` เป็น random ≥ 32 chars และเก็บใน secret manager
- [ ] HTTPS ทุกจุด (TLS terminate ที่ proxy) + HTTP→HTTPS redirect
- [ ] `SOLVEN_CORS_ORIGINS` = domain จริงเท่านั้น
- [ ] Rate limit ระดับ edge (WAF/nginx) นอกเหนือจาก in-app limiter
- [ ] Multi-instance backend → replace SQLite+in-memory limiter ด้วย PostgreSQL + Redis
- [ ] Auth จริง (OIDC/JWT) แทน service token — interface Bearer พร้อมรองรับ (app/security.py)
- [ ] Backup DB + retention policy ข้อมูลนักเรียนตาม PDPA
- [ ] Monitoring: `/health` ใช้กับ load balancer; structured log มี `request_id` ทุก request
- [ ] รัน `python -m app.migrate` ในขั้นตอน release (ไมเกรชัน idempotent)

## 5. Rollback

- ไมเกรชันเป็น additive (index เท่านั้นใน v1) — rollback = deploy image เก่า
- การเปลี่ยน schema ที่ destructive ต้องมี migration ใหม่แยกไฟล์ และห้ามแก้ไฟล์เดิมหลัง release

## 6. CI/CD

`.github/workflows/ci.yml` รันทุก push/PR: backend pytest (32 tests) + frontend lint/typecheck/build
