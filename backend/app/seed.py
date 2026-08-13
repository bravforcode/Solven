"""Deterministic demo dataset — dev/demo only (never reachable in production).

Every record is clearly synthetic (PDPA): no real student data. Content mirrors
what the real pipeline produces so the demo shows the system as it works in
production: drafts across all workflow states (pending/approved/rejected/
quarantined) plus matching audit runs.
"""

import datetime
import hashlib
import json
import uuid

from app.db import Store


def _now(days_ago: float = 0) -> str:
    ts = datetime.datetime.now(datetime.timezone.utc) - datetime.timedelta(days=days_ago)
    return ts.isoformat()


def _hash(text: str) -> str:
    return hashlib.sha256(text.encode("utf-8")).hexdigest()[:16]


# (agent, input, output, status, warnings, reviewed_by, age_days, guardrail_passed)
_DEMO_DRAFTS: list[tuple] = [
    (
        "grading",
        "คำตอบนักเรียน (ตัวอย่าง): 2+2=4 เพราะเรานับนิ้วรวมกันได้ 4",
        "คะแนนโดยประมาณ: 4/4 — ครบถ้วน (ร่าง ตรวจทานก่อนใช้งาน)\nจุดเด่น: อธิบายเหตุผลได้ถูกต้อง\nควรปรับปรุง: เขียนเครื่องหมายเท่ากับให้ชัดขึ้น",
        "pending", [], None, 0.0, 1,
    ),
    (
        "grading",
        "คำตอบนักเรียน (ตัวอย่าง): ประเทศไทยมีประชากรประมาณ 66 ล้านคน",
        "คะแนนโดยประมาณ: 3/4 — ตัวเลขถูกต้องแต่ขาดเหตุผล (ร่าง ตรวจทาน)\nจุดเด่น: จำข้อมูลหลักได้\nควรปรับปรุง: ระบุแหล่งที่มา/ปีของข้อมูล",
        "pending", [], None, 0.1, 1,
    ),
    (
        "grading",
        "คำตอบนักเรียน (ตัวอย่าง): เศษส่วน 1/2 กับ 2/4 เท่ากันเพราะตัดทอนได้",
        "คะแนนโดยประมาณ: 4/4 — เข้าใจแนวคิดการตัดทอน (ร่าง ตรวจทานก่อนใช้งาน)\nจุดเด่น: อธิบายด้วยหลักการ\nควรปรับปรุง: ไม่มีนัยสำคัญ",
        "approved", [], "demo-teacher", 1.0, 1,
    ),
    (
        "grading",
        "คำตอบนักเรียน (ตัวอย่าง): พื้นที่สามเหลี่ยม = ฐาน x สูง",
        "คะแนนโดยประมาณ: 2/4 — สูตรถูกแต่ลืมหารสอง (ร่าง ตรวจทาน)\nจุดเด่น: จำสูตรได้\nควรปรับปรุง: ตรวจสูตรพื้นที่สามเหลี่ยมอีกครั้ง",
        "rejected", [], "demo-teacher", 2.0, 1,
    ),
    (
        "grading",
        "คำตอบนักเรียน (ตัวอย่าง): อักษรไทยมี 44 ตัว",
        "คะแนนโดยประมาณ: 3/4 — ถูกต้อง (ร่าง ตรวจทานก่อนใช้งาน)\nติดต่อครูผู้ดูแลระบบ: 0812345678 เพื่อสอบถามเกณฑ์เพิ่มเติม",
        "quarantined", ["ตรวจพบเบอร์โทรในผลลัพธ์ — ควรตัดออกก่อนใช้งาน"],
        None, 0.2, 0,
    ),
    (
        "lesson-plan",
        "หัวข้อ/ตัวชี้วัด: การบวกเศษส่วนตัวส่วนเท่ากัน\nระดับชั้น: ป.5\nจำนวนนักเรียน: 30\nเวลาที่มี: 60 นาที",
        "แผนการสอน (ร่าง): 1) นำเข้าบทเรียน 10 นาที 2) กิจกรรมหลัก 35 นาที (จับคู่บวกเศษส่วน) 3) สรุป+วัดผล 15 นาที (แบบฝึกหัดท้ายชั่วโมง) — ตรวจทานก่อนใช้งาน",
        "pending", [], None, 0.0, 1,
    ),
    (
        "lesson-plan",
        "หัวข้อ/ตัวชี้วัด: วัฏจักรน้ำ\nระดับชั้น: ป.4\nจำนวนนักเรียน: 25\nเวลาที่มี: 90 นาที",
        "แผนการสอน (ร่าง): 1) สาธิตการระเหย 15 นาที 2) กิจกรรมกลุ่มวาดวัฏจักร 45 นาที 3) นำเสนอ+อภิปราย 30 นาที — ตรวจทานก่อนใช้งาน",
        "approved", [], "demo-teacher", 1.5, 1,
    ),
    (
        "reporting",
        "ผู้รับ: ผู้ปกครอง\nน้ำเสียง: สุภาพ เป็นทางการ\nสรุปความก้าวหน้า: อ่านหนังสือคล่องขึ้น ส่งงานตรงเวลามากขึ้น",
        "รายงาน (ร่าง): ด.ช.ตัวอย่างมีความก้าวหน้าด้านการอ่านหนังสืออย่างชัดเจน และส่งงานตรงเวลามากขึ้น ขอขอบคุณผู้ปกครองที่สนับสนุน — ตรวจทานก่อนส่ง",
        "pending", [], None, 0.0, 1,
    ),
    (
        "reporting",
        "ผู้รับ: ผู้ปกครอง\nน้ำเสียง: กระชับ\nสรุปความก้าวหน้า: ต้องปรับปรุงเรื่องการบ้าน",
        "รายงาน (ร่าง): นักเรียนต้องปรับปรุงเรื่องการส่งการบ้าน ขอความร่วมมือผู้ปกครองกำกับดูแลที่บ้าน — ตรวจทานก่อนส่ง",
        "rejected", [], "demo-teacher", 2.5, 1,
    ),
    (
        "reporting",
        "ผู้รับ: ผู้บริหาร\nน้ำเสียง: เป็นทางการ\nสรุปความก้าวหน้า: ผลการเรียนห้อง ป.5/1 ดีขึ้น",
        "รายงาน (ร่าง): ห้อง ป.5/1 มีผลการเรียนดีขึ้น สอบถามเพิ่มเติม: demo@example.com — ตรวจทานก่อนส่ง",
        "quarantined", ["ตรวจพบอีเมลในผลลัพธ์ — ควรตัดออกก่อนใช้งาน"],
        None, 0.3, 0,
    ),
]


def seed_demo(store: Store, teacher_id: str = "demo-teacher") -> int:
    """Insert the full demo dataset (drafts + tasks + audit runs). Returns count.

    Idempotent: fixed task/draft ids (demo-001..demo-010) make re-seeding
    REPLACE existing rows instead of duplicating them. Note: deterministic
    global ids assume a single demo tenant — irrelevant while the endpoint is
    dev-only, but the endpoint must never be enabled on a multi-tenant prod.
    """
    with store._c() as conn:
        for idx, (agent, input_text, output, status, warnings, reviewed_by,
                  age_days, guardrail_passed) in enumerate(_DEMO_DRAFTS):
            task_id = f"demo-{idx + 1:03d}"
            draft_id = f"demo-draft-{idx + 1:03d}"
            created = _now(days_ago=age_days)
            reviewed_at = _now(days_ago=age_days) if status in ("approved", "rejected") else None
            conn.execute(
                "INSERT OR REPLACE INTO tasks (id, teacher_id, agent, input, state, created_at) "
                "VALUES (?,?,?,?,?,?)",
                (task_id, teacher_id, agent, input_text, "draft_ready", created),
            )
            conn.execute(
                "INSERT OR REPLACE INTO drafts "
                "(id, task_id, teacher_id, agent, input, output, status, warnings, reviewed_by, reviewed_at, created_at) "
                "VALUES (?,?,?,?,?,?,?,?,?,?,?)",
                (draft_id, task_id, teacher_id, agent, input_text, output, status,
                 json.dumps(warnings, ensure_ascii=False),
                 reviewed_by, reviewed_at, created),
            )
            conn.execute(
                "INSERT OR REPLACE INTO agent_runs "
                "(id, task_id, agent, model, prompt_hash, output_hash, status, latency_ms, cost_estimate, guardrail_passed, created_at) "
                "VALUES (?,?,?,?,?,?,?,?,?,?,?)",
                (f"demo-run-{idx + 1:03d}", task_id, agent, "mock-deterministic-v1",
                 _hash(input_text), _hash(output), "completed",
                 320 + idx * 7, 0.0, guardrail_passed, created),
            )
    return len(_DEMO_DRAFTS)
