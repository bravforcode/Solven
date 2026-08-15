# Deploying Solven — production runbook

> ระดับ production สำหรับ deployment จริง — โปรดอ่านให้ครบก่อนขึ้นระบบ

## 1. สิ่งที่ต้องรู้ก่อน deploy

- **ทุก `/api/*` ของ backend ต้องมี Bearer token** (`SOLVEN_API_TOKEN`) — `/health` เปิดสาธารณะเท่านั้น
- **ข้อมูลนักเรียน (<20 ปี) ต้องได้รับความยินยอมจากผู้ปกครองตาม PDPA §20** (ไม่จัดเป็นข้อมูลอ่อนไหวตาม §26) — PDPA อนุญาต cross-border ได้ตาม §28/29 (SCCs/ความยินยอม) แต่ทีมเลือก self-host ในไทย (เป้า: AIS Cloud/EEC) เป็นตัวเลือก data sovereignty; ห้ามมีข้อมูลจริงใน environment ทดสอบ
- LLM: `SOLVEN_LLM=mock|anthropic|openai` — สเกลจริงใช้ open-source Thai model self-host (ดู Appendix A.6); **production ห้ามใช้ `mock`** (preflight บังคับ)
- DB: **PostgreSQL เท่านั้น** (psycopg3) — compose มี service `db` (Postgres 16); production ใช้ Railway/Postgres จริง (ดู §2b)
- **ทุก release ต้องผ่าน `python -m app.preflight` ก่อน deploy** (ตรวจ token/CORS/LLM/site URL — fail closed)

## 2. Deployment ตัวเลือก

### 2a. Docker Compose (เร็วสุด — demo/pilot ในเครื่อง)

> ⚠️ Compose นี้เป็น **dev profile เท่านั้น** (CORS `localhost`, `SOLVEN_LLM=mock`) —
> ตั้ง `SOLVEN_ENV=production` แล้ว `docker compose up` จะ fail ที่ Settings gate โดยตั้งใจ
> **Production จริงใช้ §2b** (แยก service) หรือแก้ compose ให้ชี้ production เอง (ต้องมี TLS/domain จริง)

```bash
cp backend/.env.example backend/.env   # แก้ SOLVEN_API_TOKEN ก่อน!
export SOLVEN_API_TOKEN="$(openssl rand -hex 32)"
export SOLVEN_ENV=dev                  # demo/pilot
docker compose up --build -d
# frontend: http://localhost:3000 · backend: http://localhost:8000
# NOTE: compose REQUIRED `SOLVEN_API_TOKEN` (ไม่มีค่า fallback dev อีกต่อไป)
# ตรวจ preflight ใน container: docker compose run --rm -e NEXT_PUBLIC_SITE_URL=https://... backend python -m app.preflight
```

> ℹ️ compose build frontend ด้วย `NEXT_PUBLIC_SOLVEN_MODE=demo` (build arg) — **ไม่ต้องใช้
> Clerk/Stripe keys** (middleware/ClerkProvider/billing bypass ทั้งหมด; identity คงที่
> `demo-teacher`; billing routes ตอบ 503). ถ้าต้องการ build แบบ production-style ให้
> override build arg + ส่ง keys จริง (ดู §2b) — อย่าใช้ demo mode กับ production

> ℹ️ compose มี service `db` (Postgres 16) ให้แล้ว — backend ชี้
> `postgresql://solven:solven@db:5432/solven` ผ่าน service DNS; ข้อมูลอยู่ใน volume `solven-db`;
> พอร์ต `5432:5432` map ออกมาให้ host ใช้ (ดู §2c)

### 2b. แยก service (production จริง)

```bash
# backend
cd backend
python -m venv .venv && .venv\Scripts\activate   # Windows
pip install -r requirements.txt
python -m app.migrate --db "$SOLVEN_DATABASE_URL"   # schema + migrations (CLI ไม่อ่าน env)
SOLVEN_ENV=production SOLVEN_API_TOKEN=<secret> SOLVEN_LLM=auto \
  uvicorn app.main:app --host 0.0.0.0 --port 8000
# หลาย worker/process ต้องมี reverse proxy + Redis rate limiter (ดูข้อ 4)

# frontend (build แล้ว serve ด้วย Next standalone หรือ Vercel)
cd frontend
npm ci && npm run build
NEXT_PUBLIC_SOLVEN_API_URL=https://api.example.com \
SOLVEN_API_TOKEN=<secret> \
npm run start
```

**Railway Postgres (production DB):**
1. Railway → New Project → Provision PostgreSQL (region ไทย/ใกล้เคียง)
2. ตั้ง `SOLVEN_DATABASE_URL` = Railway connection string (`postgresql://...`) — ต้องเป็น
   hostname จริง (ไม่ใช่ localhost/127.0.0.1 — prod gate ปฏิเสธ)
3. รัน migration ครั้งแรก: `python -m app.migrate --db "$SOLVEN_DATABASE_URL"`
   (CLI อ่าน `--db` เท่านั้น — ไม่อ่าน env `SOLVEN_DATABASE_URL`; idempotent — รันได้ทุก release)
4. ตั้ง `SOLVEN_TEST_DATABASE_URL` แยก (หรือใช้ Railway ตัวเดียวกันกับ DB `solven_test`)
5. **backend ต้องอยู่ใน private network (Railway private networking / VPC)** — ห้าม
   expose `/api/*` สาธารณะ; BFF (Next.js) เป็น entry point เดียวที่เรียก backend
   (ดู §4 trust model)

### 2c. Local test setup (pytest กับ Postgres จริง)

```bash
docker compose up -d db          # Postgres 16 บน localhost:5432 (user/pass/db = solven)
docker compose exec db psql -U solven -d solven -c "CREATE DATABASE solven_test;"
cd backend
$env:SOLVEN_TEST_DATABASE_URL="postgresql://solven:solven@localhost:5432/solven_test"
.venv/Scripts/python -m pytest tests -q
```

> ถ้าใช้ Postgres บริการ Windows (พอร์ต 5434) ให้ชี้ `SOLVEN_TEST_DATABASE_URL` ไปพอร์ตนั้น
> และ reset schema เมื่อ test isolation พัง: `DROP SCHEMA public CASCADE; CREATE SCHEMA public;`

## 3. ตัวแปร environment (ทั้งหมด)

| ตัวแปร | บังคับ | ค่าเริ่มต้น | คำอธิบาย |
|---|---|---|---|
| `SOLVEN_ENV` | ✅ prod | dev | dev \| production — production มี fail-closed gates |
| `SOLVEN_API_TOKEN` | ✅ prod | dev-secret-change-me | Bearer token ของ backend — **เปลี่ยนเสมอ** (prod: ≥32 chars, ห้าม default) |
| `SOLVEN_RATE_LIMIT_PER_MIN` | – | 60 | requests/IP/min (ในหน่วยความจำ — เปลี่ยนเป็น Redis เมื่อหลาย instance) |
| `SOLVEN_CORS_ORIGINS` | – | http://localhost:3000 | origin ที่ browser เรียกได้ (comma-separated; prod ห้าม localhost) |
| `SOLVEN_DATABASE_URL` | ✅ prod | – | PostgreSQL URL (production บังคับ — prod gate ปฏิเสธ localhost/127.0.0.1) |
| `SOLVEN_TEST_DATABASE_URL` | – | – | PostgreSQL URL สำหรับ pytest (ต้องมี DB `solven_test` — ดู §2c) |
| `SOLVEN_LLM` | – | mock | mock / auto / anthropic / openai (prod ห้าม mock) |
| `ANTHROPIC_API_KEY` / `OPENAI_API_KEY` | ตาม LLM | – | key ของ provider |
| `NEXT_PUBLIC_SOLVEN_API_URL` (frontend) | ✅ | localhost:8000 | URL backend จากมุมมอง Next.js server |
| `SOLVEN_BACKEND_URL` (frontend) | – | – | server-only runtime URL (compose ใช้ `http://backend:8000` — service DNS; อ่านก่อน `NEXT_PUBLIC_SOLVEN_API_URL`) |
| `SOLVEN_API_TOKEN` (frontend) | ✅ | – | token ส่งต่อจาก Next.js server → backend (ไม่รั่วถึง browser) |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` (frontend) | ✅ prod | – | publishable key จาก dashboard.clerk.com (build-time) |
| `CLERK_SECRET_KEY` (frontend) | ✅ prod | – | secret key จาก dashboard.clerk.com (server-only) |
| `STRIPE_SECRET_KEY` (frontend) | ✅ prod | – | Stripe test/live secret key (server-only) |
| `STRIPE_WEBHOOK_SECRET` (frontend) | ✅ prod | – | webhook signing secret (`whsec_...`) สำหรับ `/api/billing/webhook` |
| `STRIPE_PRICE_ID` (frontend) | ✅ prod | – | price id ของ subscription "pro" (`price_...`) |

## 4. Identity edge contract (production จำเป็น)

Production ใช้ **BFF deny-by-default + Clerk session** (AUD-C-03 / ARCH-03):

- หน้า app อยู่หลัง Clerk (Next.js middleware `auth().protect()`) — ตัวตนครูมาจาก
  **Clerk session** ที่ BFF อ่าน (`lib/bffAuth.ts` → `requirePrincipal()`)
- BFF **inject header** ต่อไปนี้ทุก request (server-to-server ไปยัง FastAPI):
  - `x-solven-principal` = teacher id (Clerk `userId` — บังคับใน production — ไม่มี → 401)
  - `x-solven-tenant` = org id (Clerk `orgId` — optional)
  - `x-solven-role` = org role (`org_role` claim — owner/admin/teacher)
  - `x-solven-org-name` = org display name (`org_name` claim, fallback `org_slug`)
- **backend trust model**: backend อ่าน `x-solven-*` headers ที่ BFF inject (401 เมื่อ
  principal ว่าง) — trust anchor คือ **Bearer token + network topology**: backend ต้อง
  reachable เฉพาะ BFF เท่านั้น (private network/VPC — ดู §2b) ห้าม expose สาธารณะ;
  ถ้า token รั่ว + backend เปิดสาธารณะ → forger `x-solven-tenant` อ่านข้อมูลข้าม org ได้
- BFF ไม่ trust ค่า client ที่ส่งมา; principal มาจาก Clerk session ที่ verify แล้ว
- **offline queue (SW flush) ใช้ได้กับ Clerk session cookie เท่านั้น** — SW fetch
  same-origin จะส่ง cookie ไปด้วย แล้ว middleware/BFF อ่าน session ได้;
  ถ้า session หมดอายุ → offline queue จะ flush ไม่ได้ (401 ทุกรอบ)
- demo/dev (NEXT_PUBLIC_SOLVEN_MODE=demo, SOLVEN_ENV=dev) ใช้ identity คงที่ `demo-teacher`
  — ไม่ต้องมี Clerk keys (middleware + ClerkProvider ถูก bypass ทั้งหมด)
- Release gate: ทดสอบว่าส่ง request ไม่มี `x-solven-principal` ใน production → 401 ทุกรอบ

## 5. Checklist ก่อน production

- [ ] `SOLVEN_ENV=production` และ `SOLVEN_API_TOKEN` random ≥ 32 chars เก็บใน secret manager
- [ ] รัน `python -m app.preflight` (backend) — ต้องออก `PREFLIGHT OK` (exit 0)
- [ ] HTTPS ทุกจุด (TLS terminate ที่ proxy) + HTTP→HTTPS redirect
- [ ] `SOLVEN_CORS_ORIGINS` = domain จริงเท่านั้น
- [ ] Rate limit ระดับ edge (WAF/nginx) นอกเหนือจาก in-app limiter
- [ ] Multi-instance backend → replace in-memory limiter ด้วย Redis (Postgres เป็น DB หลักอยู่แล้ว)
- [ ] Auth จริง (OIDC/JWT) แทน service token — interface Bearer พร้อมรองรับ (app/security.py)
- [ ] CSP hardening: `script-src 'unsafe-inline'` ปัจจุบันจำเป็นเพราะ RSC inline payload ของ Next.js (ถ้าไม่มี → hydration ไม่เกิด) — เปลี่ยนเป็น nonce-based CSP เมื่อมี infrastructure รองรับ (ดู next.config.js comment)
- [ ] Backup DB + retention policy ข้อมูลนักเรียนตาม PDPA
- [ ] Monitoring: `/health` ใช้กับ load balancer; structured log มี `request_id` ทุก request
- [ ] รัน `python -m app.migrate --db "$SOLVEN_DATABASE_URL"` ในขั้นตอน release (ไมเกรชัน idempotent; CLI ไม่อ่าน env)

## 6. Rollback

- ไมเกรชัน additive (index + `drafts.teacher_id`) — rollback = deploy image เก่า (ข้อมูลไม่หาย; ระวัง code เก่าอ่านตารางใหม่ได้ปกติ)
- การเปลี่ยน schema ที่ destructive ต้องมี migration ใหม่แยกไฟล์ และห้ามแก้ไฟล์เดิมหลัง release

## 7. CI/CD

`.github/workflows/ci.yml` รันทุก push/PR: backend pytest (Postgres service) + frontend lint/typecheck/build (dummy Clerk keys)

## 8. Manual verification runbook (Clerk + Stripe test mode)

ต้องมีคนที่มี access dashboard (Clerk + Stripe test mode) — ตามลำดับ:

1. **Sign-up**: เปิด `/sign-up` → สมัครด้วย email หรือ Google → กลับมาที่หน้าแรก
2. **Create org**: เปิด `/org` → สร้าง org (ชื่อโรงเรียน) → ระบบ provision org/member
   (lazy — ครั้งแรกที่ BFF เรียก backend)
3. **Invite**: Clerk dashboard → invite อีก email → สมัคร/accept → เข้า org เดียวกัน
4. **Cross-org draft visibility**: สร้าง draft ใน org A → สลับ org (OrganizationSwitcher)
   → ตรวจว่าไม่เห็น draft ของ org A (teacher+org scoping)
5. **Stripe test-mode checkout (API — billing UI ยังไม่ทำ, Phase 3)**:
   `curl -X POST http://localhost:3000/api/billing/checkout` (ต้อง login เป็น org **owner**)
   → `{"url": ...}` → เปิด URL → Stripe Checkout (บัตรทดสอบ `4242 4242 4242 4242`)
   → กลับมาที่ `/org?billing=success`
6. **Webhook → subscriptions**: Stripe dashboard → Events → ตรวจ `customer.subscription.created`
   ถูกส่งไป `/api/billing/webhook` (ตั้ง endpoint + `whsec_...`) → backend
   `subscriptions` table มีแถวใหม่ (org_id + stripe_sub_id + status=active) — org row
   ถูก provision อัตโนมัติถ้ายังไม่มี (webhook lazy-provision)
7. **Quota block (API)**: `POST /api/coordinator` เกิน quota ของ plan (trial=50) →
   backend ตอบ 402 `org quota exceeded for this period` (UI CTA "upgrade" ยังไม่ทำ — Phase 3)
8. **Portal plan change (API)**: `curl -X POST http://localhost:3000/api/billing/portal`
   (owner) → `{"url": ...}` → เปลี่ยน plan/cancel → Stripe ส่ง
   `customer.subscription.updated/deleted` → webhook → `subscriptions` table อัปเดต
   (dedup ด้วย event id — ส่งซ้ำไม่สร้างแถวใหม่)
