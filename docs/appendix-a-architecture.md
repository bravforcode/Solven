# ภาคผนวก A — สถาปัตยกรรมเป้าหมายระดับ production (Target Architecture)

**ทีม Solven · JUMP THAILAND Hackathon 2026**

> **สถานะของเอกสารนี้:** เป็น *สถาปัตยกรรมเป้าหมาย (target architecture)* สำหรับ production — ใช้ตอบคำถาม "จะสร้างจริงอย่างไร" ในเวทีกรรมการ
> **สถานะการ implement จริงใน repo (12 ส.ค. 2569):** frontend prototype รันได้ (Next.js + coordinator + 3 agents + review queue, mock outputs) · backend Python อยู่ระหว่างพัฒนา (FastAPI + LangGraph + SQLite audit log) · ระบบจริงทั้งหมดตามเอกสารนี้ยังเป็น target ที่จะทำต่อหลัง hackathon

---

## A.0 สรุปสถาปัตยกรรม

```
┌──────────────────────────────┐        ┌──────────────────────────────────────────────┐
│  Teacher (mobile/desktop)    │        │              Solven Backend (AIS Cloud/EEC)  │
│  PWA · offline-first        │        │                                              │
│  Next.js on Vercel Edge     │◄──────►│  FastAPI (REST/WS)                            │
└──────────────────────────────┘        │   └─ LangGraph Coordinator (StateGraph)     │
                                        │        ├─ Grading & Feedback Agent          │
                                        │        ├─ Lesson-Plan Agent                 │
                                        │        ├─ Reporting & Comm. Agent           │
                                        │        └─ Guardrail Agent (ทุกผลลัพธ์)      │
                                        │   └─ SQLite/PostgreSQL  (audit: agent_runs) │
                                        │   └─ GPU inference (Thai LLM self-host)     │
                                        └──────────────────────────────────────────────┘
```

หลักการออกแบบ 4 ข้อ:
1. **Human-in-the-loop เสมอ** — ทุกผลลัพธ์ของ agent เป็น "ร่าง" ต้องผ่านการอนุมัติของครู (มี audit trail ครบ)
2. **Agent แยกหน้าที่** — coordinator + 3 sub-agents + guardrail ลดความผิดพลาด ตรวจสอบย้อนกลับง่าย
3. **ข้อมูลอยู่ในไทย** — โฮสต์ใน AIS Cloud/EEC เพื่อรองรับ PDPA กับข้อมูลนักเรียน
4. **ต้นทุนต่อ request ต่ำ** — เลือก open-source Thai LLM ที่ self-host เพื่อสเกลถึงหลักหมื่นครู

---

## A.1 การโฮสต์และ data residency (AIS Cloud / AIS EEC)

- **Backend ทั้งหมดรันบน AIS Cloud / AIS EEC** (data center ในไทย): FastAPI service, GPU inference nodes, databases, object storage
- **เหตุผล:** ข้อมูลนักเรียน/ครูเป็นข้อมูลที่ต้องคุ้มครอง — เด็กอายุต่ำกว่า 20 ปี **ไม่ได้อยู่ในบัญชี "ข้อมูลอ่อนไหว" (sensitive data) ตาม PDPA §26** แต่เป็นข้อมูลที่ต้องได้รับความยินยอมพิเศษจากผู้ปกครอง (§20) รวมถึงหลักการลดข้อมูลให้น้อยที่สุด (data minimization) และสิทธิขอลบ (§33) · PDPA **ไม่ได้บังคับ** ให้เก็บข้อมูลในประเทศ (cross-border ทำได้ตาม §28/29 ด้วย SCCs/ความยินยอม) — การโฮสต์ในไทยจึงเป็น **ตัวเลือกเพื่ออธิปไตยข้อมูล (data sovereignty)** ไม่ใช่ข้อบังคับกฎหมาย อย่างไรก็ตามการรันบน AIS Cloud/EEC ยังคงตรงโจทย์ "ใช้เทคโนโลยี AIS" และลดความเสี่ยงเรื่องการส่งข้อมูลข้ามพรมแดน
- Frontend static assets โฮสต์บน Vercel Edge (เนื้อหาสาธารณะเท่านั้น — ไม่มีข้อมูลนักเรียนอยู่บน edge)

## A.2 Component breakdown

| Component | เทคโนโลยี | หน้าที่ |
|---|---|---|
| Frontend PWA | Next.js (App Router) + TypeScript | UI ครู: ส่งงานตรวจ, ร่างแผน, ร่างรายงาน, อนุมัติ/ปฏิเสธ |
| API Gateway | FastAPI | REST endpoints, auth (OAuth2/JWT), rate limit |
| Coordinator | LangGraph StateGraph | สเตตแมชชีนกลาง: รับงาน → route → sub-agent → guardrail → draft → ครูกำกับ |
| Sub-agents | LangGraph nodes (Python) | grading / lesson-plan / reporting |
| Guardrail | Python + LLM judge | ตรวจ PII, ข้อมูลหลอน (grounding), ตรงหลักสูตร, ภาษาเหมาะสม |
| Audit store | SQLite (ต้นแบบ) → PostgreSQL | ตาราง `agent_runs`, `drafts`, `teachers` (ดู A.7) |
| LLM runtime | vLLM/TGI บน GPU (AIS Cloud) | inference สำหรับ Thai LLM self-host |

## A.3 Coordinator (LangGraph StateGraph)

สถานะ (state) ของงาน 1 รายการ:

```
submitted → routed → agent_working → guardrail_check → draft_ready → (teacher)
                │                            │
                └── retry (max 2) ───────────┘ fail → draft_with_warning
```

- **Routing logic:** ครูส่งงานพร้อม metadata (ประเภทงาน, วิชา, ชั้น, rubric/หลักสูตร) → coordinator เลือก sub-agent + ประกอบ context (หลักสูตรแกนกลาง, ข้อมูลห้องเรียน, งานก่อนหน้า)
- **Human-in-the-loop checkpoint:** ทุกสาขาของกราฟจบที่ `draft_ready` ซึ่งเป็นสถานะ "รอครูอนุมัติ" — ไม่มีสาขาใด approve ตัวเอง
- **State persistence:** งานทุกสถานะบันทึกลงตาราง `agent_runs` (audit) + `drafts` (ผลลัพธ์) เพื่อให้ resume งานได้แม้ process ตาย

## A.4 Grading & Feedback Agent

- **Input:** ภาพ/ข้อความคำตอบนักเรียน, rubric ที่ครูกำหนด (เกณฑ์ + คะแนน), วิชา/ชั้น
- **Process:** OCR (ถ้าเป็นภาพ) → ตรวจตาม rubric → ให้คะแนน + feedback รายบุคคลภาษาไทยเข้าใจง่าย → ระบุจุดที่ AI ไม่แน่ใจ (ขอครูตรวจซ้ำ) → guardrail
- **Edge cases ที่ออกแบบไว้:** ลายมืออ่านยาก, คำตอบนอก rubric, ความพยายามโกง/คำตอบลอกกัน (flag ให้ครู), งานกลุ่ม vs รายบุคคล
- **ไม่ทำ:** ตัดสินผลการเรียนสุดท้าย, ออกเกรด — ครูเป็นคนตัดสินเสมอ

## A.5 Lesson-Plan Agent

- **Input:** มาตรฐานการเรียนรู้/ตัวชี้วัด (หลักสูตรแกนกลาง 2551/ฉบับปรับปรุง), จำนวนนักเรียน, คละชั้น/ระดับ, เวลาที่มี
- **Process:** ดึงตัวชี้วัดที่ตรง → ร่างแผน (จุดประสงค์, กิจกรรม, สื่อ, การวัดผล) → ตรวจการตรงหลักสูตรกับ guardrail → draft
- **Edge cases:** ห้องคละชั้น (multi-grade), นักเรียนขาดทักษะพื้นฐาน, ห้องที่ไม่มีอุปกรณ์เทคโนโลยี

## A.6 ตัวเลือก LLM และเหตุผล (Thai open-source)

| ช่วงการพัฒนา | โมเดล | เหตุผล |
|---|---|---|
| ตอนนี้ (prototype) | API: Anthropic Claude / OpenAI GPT | เร็ว ง่าย ใช้ validate UX ก่อน |
| หลัง hackathon (สเกลจริง) | **Typhoon2 / Typhoon (SCB 10X)** หรือ SeaLLM / OpenThaiGPT (self-host บน vLLM) | 1) ภาษาไทยคุณภาพสูง 2) ต้นทุนต่อ request ต่ำกว่า API มากเมื่อสเกลหลักหมื่นครู 3) ข้อมูลไม่ออกนอก infra ไทย 4) ปรับ fine-tune ตาม rubric/หลักสูตรไทยได้ |

**เหตุผลไม่ใช้ proprietary API ในสเกลจริง:** ต้นทุนต่อ token × ปริมาณงานครูทั้งประเทศสูงมาก และข้อมูลนักเรียนจะออกนอกประเทศ (PDPA) — self-host เปิดทางให้เลือกขนาดโมเดลตามงบ GPU ของ AIS Cloud ได้

## A.7 Data model และ audit log

ตารางหลัก (SQLite → PostgreSQL):

- **teachers** — id, school_id, subjects, grade_levels, rubric_prefs
- **classes / students** (pseudonymized) — id, class_id, level, ไม่เก็บข้อมูลที่ระบุตัวได้เกินจำเป็น
- **agent_runs** (audit — บันทึกทุก agent call) — id, task_id, agent, model, prompt_hash, output_hash, status, latency_ms, cost_estimate, guardrail_passed, created_at
- **drafts** — id, task_id, agent, input, output, status (pending/approved/rejected), reviewed_by, reviewed_at
- **tasks** — id, teacher_id, type, state, created_at

**หลักการ PDPA:** data minimization (เก็บเท่าที่จำเป็น), pseudonymization (นักเรียน), consent log, ลบเมื่อหมดความจำเป็น (retention policy), ไม่มีข้อมูลจริงใน environment ทดสอบ · สำหรับเด็กอายุต่ำกว่า 20 ปี ให้ความยินยอมจากผู้ปกครองตาม §20 (ไม่ใช่ข้อมูลอ่อนไหวตาม §26) · cross-border อนุญาตได้หากมี SCCs/แจ้งผู้ปกครองถึงการส่งข้อมูลข้ามพรมแดน

## A.8 กลยุทธ์ offline-first

- **PWA + Service Worker:** ใช้ได้บนเน็ตมือถือ 4G พื้นที่ห่างไกล โหลดครั้งแรกแล้ว cache UI ทั้งหมด
- **IndexedDB ฝั่ง client:** งานที่ครูสร้างตอน offline เก็บบนเครื่อง → **background sync** ส่งเข้าระบบเมื่อมีสัญญาณ
- **Conflict strategy:** งานทุกชิ้นมี id + timestamp; ถ้าซิงค์ชนกัน ฝั่ง server เป็นแหล่งจริง (server-wins) + แจ้งเตือนครู
- เหตุผล: ครูในโรงเรียนขนาดเล็กจำนวนมากมีอินเทอร์เน็ตไม่เสถียร — ระบบต้องไม่ "ตาย" เมื่อเน็ตขาด

## A.9 Guardrail Agent

ตรวจก่อนผลลัพธ์ถึงครูเสมอ:
1. **PII leak** — ไม่ให้ชื่อนักเรียน/ข้อมูลส่วนตัวหลุดในรายงานที่ส่งต่อ
2. **Grounding / hallucination** — ทุกข้อความที่อ้างคะแนน/ผลการเรียนต้องมีหลักฐานจาก input จริง (ถ้าไม่พบ → ตัดออก + flag)
3. **Curriculum alignment** — แผนการสอนต้องอ้างตัวชี้วัดจริงในหลักสูตรแกนกลาง
4. **ภาษา/โทน** — ภาษาไทยถูกต้องเหมาะสมกับบริบทครู-ผู้ปกครอง
ผลตรวจบันทึกลง `agent_runs.guardrail_passed` — ครูเห็น warning ถ้าผ่านแบบมีเงื่อนไข

## A.10 Security & PDPA

- Auth: OAuth2/JWT (ต่อกับระบบ SSO ของ สพฐ./AIS ในระยะขยายผล)
- RBAC: ครูเห็นเฉพาะข้อมูลห้องตนเอง, ผู้บริหารเห็นเฉพาะภาพรวมระดับตน
- Data at rest: เข้ารหัส DB + object storage; Data in transit: TLS ทุกจุด
- Audit: `agent_runs` + access log — ใครเห็นข้อมูลอะไร เมื่อไหร่
- กรณีละเมิด/ลบข้อมูล: consent-based retention + API ลบข้อมูลนักเรียนตามคำขอ

## A.11 การทดสอบและประเมินผล

- **Unit/Integration:** pytest ต่อ coordinator state machine, routing, guardrail (ทุก agent ต้องมี test)
- **Rubric evaluation:** ชุดทดสอบคำตอบนักเรียนจริง (pseudonymized) เปรียบเทียบคะแนน AI vs ครูผู้เชี่ยวชาญ — Kappa agreement ≥ 0.8 เป็นเป้า
- **Pilot:** ครู 10-20 คน ทดลองใช้จริง 4 สัปดาห์ วัด: ชั่วโมงที่ประหยัดได้/สัปดาห์, อัตราการ approve โดยไม่แก้ไข, satisfaction survey
- **Red-team:** ทดสอบ prompt injection (ครูหรือนักเรียนพยายามหลอกให้ AI ออกเกรดสูง/เปิดเผยข้อมูล)

## A.12 แผนขยายผล 3 ระยะ

| ระยะ | ช่วงเวลา | เป้าหมาย | วัดผล |
|---|---|---|---|
| **P1 — Pilot** | เดือน 1-4 | 10-20 โรงเรียนขนาดเล็ก (ผ่านเครือข่าย สพฐ./NIA/กองทุนเพื่อความเสมอภาคฯ) | ชั่วโมงครูที่ประหยัด, Kappa rubric, satisfaction |
| **P2 — District** | เดือน 5-12 | ขยายสู่เขตพื้นที่การศึกษา 3-5 เขต (~1,000 ครู) + เริ่มเก็บข้อมูลผลกระทบ | อัตรา adoption รายสัปดาห์, เวลาตอบสนองผู้ปกครอง |
| **P3 — Scale ผ่าน NDLP / ระบบนิเวศ AIS** | ปี 2 | Integrate เป็นโมดูลใน **NDLP** (ช่องทาง K-12 ของรัฐที่มีฐานครูอยู่แล้ว) และ/หรือวางเป็นเลเยอร์ครูใน **AIS AISpace** (LearnDi เป็นแพลตฟอร์มองค์กร ไม่ใช่ K-12) + ประเมินขยาย IoT (NB-IoT/Magellan) สำหรับโรงเรียนห่างไกล | จำนวนครู active, ผลสำรวจภาระงาน, (ระยะยาว) ผลสัมฤทธิ์นักเรียน |

**โมเดลความยั่งยืน:** ระยะแรกเน้นผลกระทบเชิงระบบ (พาร์ตเนอร์ภาครัฐ) — โมเดลรายได้พิจารณาทีหลัง เช่น ให้หน่วยงาน/ผู้ให้บริการด้านการศึกษาจ่ายรายปีต่อโรงเรียน หรือ bundled กับบริการ AIS LearnDi
