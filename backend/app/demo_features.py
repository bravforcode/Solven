"""Deterministic demo feature generators — dev/demo only (never production).

Every generator returns the SAME output for the same input (no randomness),
so the demo is reproducible. All data is clearly synthetic (PDPA): no real
student data anywhere. These power the /api/demo/* endpoints that the
frontend "Demo Center" pages consume.
"""

from __future__ import annotations

import datetime
import re
from typing import Any

# ---------------------------------------------------------------------------
# Mock roster (feature 8: ห้องเรียน/รายชื่อนักเรียน)
# ---------------------------------------------------------------------------

_ROSTER_CLASSES: list[dict[str, Any]] = [
    {
        "id": "class-p4-1",
        "name": "ป.4/1",
        "room": "ห้อง 1",
        "teacher": "นางสาวสมหญิง ใจดี",
        "students": [
            {"id": "s-001", "name": "เด็กชายสมชาย ใจดี", "gender": "ช", "parentPhone": "081-234-0001"},
            {"id": "s-002", "name": "เด็กหญิงสมหญิง รักเรียน", "gender": "ญ", "parentPhone": "081-234-0002"},
            {"id": "s-003", "name": "เด็กชายอนุชา แซ่ลี้", "gender": "ช", "parentPhone": "081-234-0003"},
            {"id": "s-004", "name": "เด็กหญิงพิมพ์ชนก ศรีสุข", "gender": "ญ", "parentPhone": "081-234-0004"},
            {"id": "s-005", "name": "เด็กชายธนกร วงษ์คำ", "gender": "ช", "parentPhone": "081-234-0005"},
        ],
    },
    {
        "id": "class-p5-1",
        "name": "ป.5/1",
        "room": "ห้อง 2",
        "teacher": "นายสมชาย มากมี",
        "students": [
            {"id": "s-006", "name": "เด็กหญิงกนกพร ทองดี", "gender": "ญ", "parentPhone": "081-234-0006"},
            {"id": "s-007", "name": "เด็กชายวรเมธ กล้าหาญ", "gender": "ช", "parentPhone": "081-234-0007"},
            {"id": "s-008", "name": "เด็กหญิงสุชาดา พรมมา", "gender": "ญ", "parentPhone": "081-234-0008"},
            {"id": "s-009", "name": "เด็กชายณัฐพล ขันทอง", "gender": "ช", "parentPhone": "081-234-0009"},
            {"id": "s-010", "name": "เด็กหญิงมณีรัตน์ สุขสันต์", "gender": "ญ", "parentPhone": "081-234-0010"},
        ],
    },
    {
        "id": "class-m1-1",
        "name": "ม.1/1",
        "room": "ห้อง 3",
        "teacher": "นายประเสริฐ สุขสันต์",
        "students": [
            {"id": "s-011", "name": "เด็กชายกิตติพงษ์ แก้วใส", "gender": "ช", "parentPhone": "081-234-0011"},
            {"id": "s-012", "name": "เด็กหญิงอรอุมา ใจบุญ", "gender": "ญ", "parentPhone": "081-234-0012"},
            {"id": "s-013", "name": "เด็กชายพีรพัฒน์ ทรัพย์เจริญ", "gender": "ช", "parentPhone": "081-234-0013"},
            {"id": "s-014", "name": "เด็กหญิงจิดาภา วัฒนา", "gender": "ญ", "parentPhone": "081-234-0014"},
            {"id": "s-015", "name": "เด็กชายศุภกร หมื่นแก้ว", "gender": "ช", "parentPhone": "081-234-0015"},
        ],
    },
]


def roster_default() -> list[dict[str, Any]]:
    """Mock class roster (feature 8)."""
    return _ROSTER_CLASSES


# ---------------------------------------------------------------------------
# Mock question bank + exam generator (feature 9)
# ---------------------------------------------------------------------------

_QUESTION_BANK: list[dict[str, Any]] = [
    {"id": "q-001", "subject": "คณิตศาสตร์", "grade": "ป.5", "type": "choice",
     "question": "เศษส่วน 1/2 เท่ากับข้อใด", "choices": ["2/4", "1/3", "3/4", "2/3"], "answer": 0,
     "indicator": "ค1.1 ป.5/1", "difficulty": "ง่าย"},
    {"id": "q-002", "subject": "คณิตศาสตร์", "grade": "ป.5", "type": "choice",
     "question": "ผลบวกของ 3/5 + 1/5 เท่ากับเท่าใด", "choices": ["4/10", "4/5", "3/10", "2/5"], "answer": 1,
     "indicator": "ค1.1 ป.5/2", "difficulty": "ปานกลาง"},
    {"id": "q-003", "subject": "คณิตศาสตร์", "grade": "ป.5", "type": "short",
     "question": "พื้นที่สามเหลี่ยมฐาน 8 ซม. สูง 5 ซม. เท่ากับกี่ตารางเซนติเมตร", "answer": "20",
     "indicator": "ค2.2 ป.5/1", "difficulty": "ปานกลาง"},
    {"id": "q-004", "subject": "วิทยาศาสตร์", "grade": "ป.4", "type": "choice",
     "question": "น้ำในวัฏจักรน้ำระเหยจากแหล่งใด", "choices": ["ทะเลและแม่น้ำ", "ภูเขา", "ใต้ดิน", "เมฆ"], "answer": 0,
     "indicator": "ว3.1 ป.4/2", "difficulty": "ง่าย"},
    {"id": "q-005", "subject": "วิทยาศาสตร์", "grade": "ป.4", "type": "short",
     "question": "พืชหายใจด้วยอวัยวะใด", "answer": "ปากใบ (stomata)",
     "indicator": "ว1.1 ป.4/1", "difficulty": "ง่าย"},
    {"id": "q-006", "subject": "ภาษาไทย", "grade": "ป.4", "type": "choice",
     "question": "ข้อใดเป็นคำที่มีความหมายตรงข้ามกับคำว่า 'สว่าง'", "choices": ["มืด", "สวย", "เร็ว", "ใหญ่"], "answer": 0,
     "indicator": "ท4.1 ป.4/1", "difficulty": "ง่าย"},
    {"id": "q-007", "subject": "ภาษาไทย", "grade": "ป.4", "type": "short",
     "question": "คำว่า 'จับใจความ' หมายถึงอะไร (ตอบสั้นๆ)", "answer": "การจับประเด็นสำคัญของเรื่อง",
     "indicator": "ท1.1 ป.4/3", "difficulty": "ปานกลาง"},
    {"id": "q-008", "subject": "สังคมศึกษา", "grade": "ป.5", "type": "choice",
     "question": "แม่น้ำเจ้าพระยาไหลลงสู่ทะเลใด", "choices": ["อ่าวไทย", "ทะเลอันดามัน", "อ่าวมะนาว", "ทะเลจีนใต้"], "answer": 0,
     "indicator": "ส5.1 ป.5/2", "difficulty": "ง่าย"},
    {"id": "q-009", "subject": "คณิตศาสตร์", "grade": "ม.1", "type": "choice",
     "question": "สมการ x + 5 = 12 มีคำตอบเท่ากับข้อใด", "choices": ["5", "7", "12", "17"], "answer": 1,
     "indicator": "ค1.2 ม.1/1", "difficulty": "ง่าย"},
    {"id": "q-010", "subject": "คณิตศาสตร์", "grade": "ม.1", "type": "short",
     "question": "จงหาค่า x จากสมการ 2x - 4 = 10", "answer": "7",
     "indicator": "ค1.2 ม.1/2", "difficulty": "ปานกลาง"},
]


def question_bank(subject: str | None = None, grade: str | None = None) -> list[dict[str, Any]]:
    """Mock question bank (feature 9) — filterable, deterministic."""
    rows = _QUESTION_BANK
    if subject:
        rows = [q for q in rows if q["subject"] == subject]
    if grade:
        rows = [q for q in rows if q["grade"] == grade]
    return rows


def generate_exam(subject: str, grade: str, count: int = 5) -> dict[str, Any]:
    """Deterministic exam generator (feature 9): picks questions from the bank
    in fixed order (no randomness) and assembles an exam paper + answer key."""
    pool = [q for q in _QUESTION_BANK if q["subject"] == subject and q["grade"] == grade]
    if not pool:
        pool = [q for q in _QUESTION_BANK if q["subject"] == subject] or _QUESTION_BANK
    picked = pool[: max(1, min(count, len(pool)))]
    exam_id = f"exam-{subject}-{grade}-{len(picked)}"
    return {
        "id": exam_id,
        "subject": subject,
        "grade": grade,
        "title": f"ข้อสอบ {subject} ชั้น {grade} (ตัวอย่าง)",
        "questions": [
            {
                "no": i + 1,
                "type": q["type"],
                "question": q["question"],
                "choices": q.get("choices"),
                "indicator": q["indicator"],
                "difficulty": q["difficulty"],
                "score": 1,
            }
            for i, q in enumerate(picked)
        ],
        "answerKey": [
            {"no": i + 1, "answer": q["answer"]} for i, q in enumerate(picked)
        ],
        "totalScore": len(picked),
        "generatedBy": "mock-exam-generator-v1",
    }


# ---------------------------------------------------------------------------
# Mock RAG knowledge base (feature 12)
# ---------------------------------------------------------------------------

_KNOWLEDGE_BASE: list[dict[str, Any]] = [
    {"id": "kb-001", "title": "หลักสูตรแกนกลาง 2551 — คณิตศาสตร์ ป.5",
     "content": "สาระที่ 1 จำนวนและการดำเนินการ: การบวก ลบ คูณ หารเศษส่วน การเปรียบเทียบเศษส่วน",
     "tags": ["คณิตศาสตร์", "ป.5", "หลักสูตร"], "source": "หลักสูตรแกนกลางการศึกษาขั้นพื้นฐาน 2551"},
    {"id": "kb-002", "title": "หลักสูตรแกนกลาง 2551 — วิทยาศาสตร์ ป.4",
     "content": "สาระที่ 3 สารและสมบัติของสาร: วัฏจักรน้ำ การระเหย การควบแน่น การตกตะกอน",
     "tags": ["วิทยาศาสตร์", "ป.4", "หลักสูตร"], "source": "หลักสูตรแกนกลางการศึกษาขั้นพื้นฐาน 2551"},
    {"id": "kb-003", "title": "คู่มือครู — การอ่านจับใจความสำคัญ",
     "content": "การอ่านจับใจความสำคัญ: หาประโยคหลัก ประโยคสนับสนุน สรุปความด้วยภาษาของตนเอง",
     "tags": ["ภาษาไทย", "ป.4", "คู่มือครู"], "source": "คู่มือครูภาษาไทย สสวท."},
    {"id": "kb-004", "title": "ระเบียบกระทรวงศึกษาธิการว่าด้วยการประเมินผล",
     "content": "การประเมินผลการเรียนรู้: ระดับคุณภาพ 4 = ดีเยี่ยม, 3 = ดี, 2 = พอใช้, 1 = ผ่านเกณฑ์ขั้นต่ำ, 0 = ไม่ผ่าน",
     "tags": ["การประเมิน", "ระเบียบ"], "source": "ระเบียบกระทรวงศึกษาธิการ ว่าด้วยการประเมินผลการเรียนรู้"},
    {"id": "kb-005", "title": "แนวปฏิบัติ PDPA สำหรับสถานศึกษา",
     "content": "ข้อมูลนักเรียนเป็นข้อมูลส่วนบุคคล: ต้องได้รับความยินยอมจากผู้ปกครองก่อนเก็บรวบรวม ใช้ หรือเปิดเผย",
     "tags": ["PDPA", "กฎหมาย"], "source": "สำนักงานคณะกรรมการคุ้มครองข้อมูลส่วนบุคคล"},
]


def rag_search(query: str, limit: int = 3) -> list[dict[str, Any]]:
    """Mock RAG (feature 12): keyword scoring over the knowledge base.
    Deterministic — same query → same ranking."""
    tokens = [t for t in re.split(r"[\s,]+", query.lower()) if t]
    scored: list[tuple[int, dict[str, Any]]] = []
    for doc in _KNOWLEDGE_BASE:
        haystack = " ".join([doc["title"], doc["content"], " ".join(doc["tags"])]).lower()
        score = sum(1 for t in tokens if t in haystack)
        scored.append((score, doc))
    scored.sort(key=lambda x: (-x[0], x[1]["id"]))
    hits = [doc for score, doc in scored if score > 0][:limit]
    return hits or [{"id": "kb-none", "title": "ไม่พบเอกสารที่เกี่ยวข้อง",
                     "content": "ลองค้นด้วยคำอื่น เช่น ชื่อวิชา ระดับชั้น หรือหัวข้อ", "tags": [], "source": ""}]


# ---------------------------------------------------------------------------
# Mock LLM-judge (feature 13)
# ---------------------------------------------------------------------------

def llm_judge(output: str, rubric: str | None = None) -> dict[str, Any]:
    """Mock LLM-judge (feature 13): deterministic quality scoring based on
    simple heuristics (length, structure, rubric coverage keywords)."""
    text = output or ""
    length_ok = len(text) >= 40
    has_structure = any(marker in text for marker in ("จุดเด่น", "ควรปรับปรุง", "1)", "2)", "3)"))
    has_pii = any(marker in text for marker in ("081-", "081 ", "@", "บัตรประชาชน"))
    rubric_words = 0
    if rubric:
        for word in re.findall(r"[ก-๙]{2,}", rubric):
            if word in text:
                rubric_words += 1
    score = 0.0
    if length_ok:
        score += 0.4
    if has_structure:
        score += 0.3
    if rubric_words >= 2:
        score += 0.3
    elif rubric_words >= 1:
        score += 0.15
    verdict = "pass" if score >= 0.6 and not has_pii else ("fail" if has_pii else "review")
    return {
        "score": round(score, 2),
        "verdict": verdict,
        "checks": {
            "length_ok": length_ok,
            "has_structure": has_structure,
            "rubric_coverage": rubric_words,
            "has_pii": has_pii,
        },
        "judgeModel": "mock-llm-judge-v1",
    }


# ---------------------------------------------------------------------------
# Mock early warning (feature 14)
# ---------------------------------------------------------------------------

_STUDENT_SCORES: dict[str, list[int]] = {
    "s-001": [7, 8, 8, 9], "s-002": [6, 7, 7, 8], "s-003": [4, 3, 3, 2],
    "s-004": [9, 9, 10, 10], "s-005": [5, 5, 4, 4], "s-006": [8, 8, 9, 9],
    "s-007": [3, 4, 3, 2], "s-008": [7, 6, 7, 6], "s-009": [5, 4, 4, 3],
    "s-010": [10, 10, 9, 10], "s-011": [6, 6, 5, 5], "s-012": [8, 9, 9, 9],
    "s-013": [4, 4, 3, 3], "s-014": [7, 8, 8, 8], "s-015": [5, 5, 6, 5],
}


def early_warning() -> list[dict[str, Any]]:
    """Mock early-warning (feature 14): flag students whose score trend is
    declining (last 2 < first 2) or whose latest score is below 4/10."""
    warnings: list[dict[str, Any]] = []
    for cls in _ROSTER_CLASSES:
        for stu in cls["students"]:
            scores = _STUDENT_SCORES.get(stu["id"], [5, 5, 5, 5])
            declining = sum(scores[-2:]) < sum(scores[:2])
            at_risk = scores[-1] < 4
            if declining or at_risk:
                warnings.append({
                    "studentId": stu["id"],
                    "studentName": stu["name"],
                    "className": cls["name"],
                    "scores": scores,
                    "trend": "declining" if declining else "stable",
                    "risk": "high" if at_risk else "medium",
                    "reason": ("คะแนนล่าสุดต่ำกว่าเกณฑ์" if at_risk
                               else "คะแนนมีแนวโน้มลดลงต่อเนื่อง"),
                    "suggestedAction": "พบครูที่ปรึกษา + แจ้งผู้ปกครอง + จัดกิจกรรมซ่อมเสริม",
                })
    return warnings


# ---------------------------------------------------------------------------
# Mock MOE report (feature 11)
# ---------------------------------------------------------------------------

def moe_report(period: str = "ภาคเรียนที่ 1/2569") -> dict[str, Any]:
    """Mock MOE Exchange report (feature 11): deterministic summary rows."""
    return {
        "period": period,
        "school": "โรงเรียนบ้านสวนฝั่งสุข",
        "generatedAt": datetime.datetime.now(datetime.timezone.utc).isoformat(),
        "summary": {
            "totalStudents": 15,
            "totalClasses": 3,
            "avgScore": 6.4,
            "passRate": 0.73,
            "attendanceRate": 0.94,
        },
        "sections": [
            {"name": "จำนวนนักเรียน", "value": "15 คน (ชาย 8, หญิง 7)"},
            {"name": "ผลการเรียนเฉลี่ย", "value": "6.4/10 — ผ่านเกณฑ์ขั้นต่ำ"},
            {"name": "อัตราการมาเรียน", "value": "94% — ดี"},
            {"name": "นักเรียนเสี่ยง", "value": "3 คน — อยู่ในแผนซ่อมเสริม"},
        ],
        "status": "draft",
        "generatedBy": "mock-moe-report-v1",
    }


# ---------------------------------------------------------------------------
# Mock attendance (feature 21)
# ---------------------------------------------------------------------------

def attendance_summary(period: str = "สัปดาห์นี้") -> dict[str, Any]:
    """Mock attendance summary (feature 21): deterministic per-class rows."""
    return {
        "period": period,
        "generatedAt": datetime.datetime.now(datetime.timezone.utc).isoformat(),
        "classes": [
            {"className": "ป.4/1", "present": 47, "absent": 3, "late": 2, "rate": 0.94},
            {"className": "ป.5/1", "present": 46, "absent": 4, "late": 1, "rate": 0.92},
            {"className": "ม.1/1", "present": 48, "absent": 2, "late": 3, "rate": 0.96},
        ],
        "total": {"present": 141, "absent": 9, "late": 6, "rate": 0.94},
        "generatedBy": "mock-attendance-v1",
    }


# ---------------------------------------------------------------------------
# Mock audit summary (feature 32)
# ---------------------------------------------------------------------------

def audit_summary() -> dict[str, Any]:
    """Mock audit dashboard summary (feature 32): aggregates over the demo
    agent_runs dataset (10 runs, deterministic)."""
    return {
        "totalRuns": 10,
        "byAgent": {"grading": 5, "lesson-plan": 3, "reporting": 2},
        "byStatus": {"completed": 10, "failed": 0},
        "guardrailPassRate": 0.8,
        "avgLatencyMs": 350,
        "totalCostEstimate": 0.0,
        "recent": [
            {"runId": f"demo-run-{i:03d}", "agent": agent, "latencyMs": 320 + i * 7,
             "guardrailPassed": i not in (4, 9)}
            for i, agent in enumerate(["grading", "grading", "grading", "grading", "grading",
                                       "lesson-plan", "lesson-plan", "lesson-plan",
                                       "reporting", "reporting"])
        ],
        "generatedBy": "mock-audit-summary-v1",
    }


# ---------------------------------------------------------------------------
# Mock LINE preview (feature 3)
# ---------------------------------------------------------------------------

def line_preview(text: str, recipient: str = "ผู้ปกครอง") -> dict[str, Any]:
    """Mock LINE OA message preview (feature 3): wraps the teacher-approved
    text in a LINE-style message envelope. Human-in-the-loop preserved: the
    teacher must approve before this is 'sent' (demo only)."""
    return {
        "recipient": recipient,
        "message": text,
        "preview": f"[LINE OA — Solven]\nถึง {recipient}\n\n{text}\n\n— ข้อความนี้สร้างโดย Solven (ตัวอย่าง)",
        "status": "ready_for_approval",
        "sent": False,
        "generatedBy": "mock-line-preview-v1",
    }


# ---------------------------------------------------------------------------
# Mock notifications (feature 3: ศูนย์แจ้งเตือน)
# ---------------------------------------------------------------------------

def notifications() -> list[dict[str, Any]]:
    """Mock notification feed (feature 3): deterministic, newest first.

    Covers the real event types the system emits: draft ready for review,
    guardrail quarantine, quota warning, billing event, and system notice.
    """
    now = datetime.datetime.now(datetime.timezone.utc)
    def ago(minutes: int) -> str:
        return (now - datetime.timedelta(minutes=minutes)).isoformat()
    return [
        {
            "id": "ntf-001",
            "type": "draft_ready",
            "title": "ร่างผลการตรวจงานพร้อมตรวจทาน",
            "body": "งานตรวจการบ้านวิชาคณิตศาสตร์ ป.5/1 เสร็จแล้ว 1 รายการ รอการอนุมัติ",
            "createdAt": ago(12),
            "read": False,
            "link": "/drafts?agent=grading",
        },
        {
            "id": "ntf-002",
            "type": "guardrail",
            "title": "การ์ดกันความผิดพลาดแจ้งเตือน",
            "body": "ตรวจพบเบอร์โทรในผลลัพธ์การตรวจงาน — ถูกกักกัน (quarantine) รอการแก้ไข",
            "createdAt": ago(45),
            "read": False,
            "link": "/drafts?status=quarantined",
        },
        {
            "id": "ntf-003",
            "type": "quota",
            "title": "โควตาการใช้งานใกล้เต็ม",
            "body": "โควตาเดือนนี้ใช้ไป 80% (400/500 หน่วย) — ติดต่อผู้ดูแลเพื่อเพิ่มแพ็กเกจ",
            "createdAt": ago(60 * 5),
            "read": False,
            "link": "/settings",
        },
        {
            "id": "ntf-004",
            "type": "billing",
            "title": "ใบแจ้งหนี้ประจำเดือนออกแล้ว",
            "body": "ใบแจ้งหนี้เดือนนี้: 0 บาท (โหมดสาธิต) — ดูรายละเอียดได้ที่หน้าการเงิน",
            "createdAt": ago(60 * 26),
            "read": True,
            "link": "/settings",
        },
        {
            "id": "ntf-005",
            "type": "system",
            "title": "อัปเดตระบบ Solven v0.9",
            "body": "เพิ่มศูนย์แจ้งเตือน, ระบบรายชื่อนักเรียน, คลังข้อสอบ และอื่นๆ อีกมากมาย",
            "createdAt": ago(60 * 49),
            "read": True,
            "link": "/about",
        },
    ]