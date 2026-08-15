"""Deterministic demo generators — Teaching workstream (งานสอน).

Generators for: ตารางสอน (timetable), การบ้าน (homework), ข้อสอบออนไลน์
(exam-runner), แผนการเรียนรู้รายปี (curriculum), PLC ชุมชนแห่งการเรียนรู้
ทางวิชาชีพ (plc-feed), วิจัยในชั้นเรียน (research), สื่อการเรียนรู้ (media).

Dev/demo only (never production). Every generator returns the SAME output
for the same input — no randomness — so the demo is reproducible. All data
is synthetic Thai demo data (PDPA): no real student/person data anywhere.
These power the /api/demo/* endpoints (routes registered separately).
"""

from __future__ import annotations

import datetime
from typing import Any

# ---------------------------------------------------------------------------
# Mock timetable (ตารางสอน: Mon–Fri × 8 periods)
# ---------------------------------------------------------------------------

_TIMETABLE_DAYS: list[str] = ["จันทร์", "อังคาร", "พุธ", "พฤหัสบดี", "ศุกร์"]
_TIMETABLE_PERIODS: list[str] = [
    "08:30–09:20", "09:20–10:10", "10:25–11:15", "11:15–12:05",
    "13:00–13:50", "13:50–14:40", "14:50–15:40", "15:40–16:30",
]
_TIMETABLE_SCHEDULES: dict[str, list[str]] = {
    "ป.4/1": ["คณิตศาสตร์", "ภาษาไทย", "วิทยาศาสตร์", "ภาษาอังกฤษ", "สังคมศึกษา", "สุขศึกษา", "ศิลปะ", "การงานอาชีพ"],
    "ป.5/1": ["ภาษาไทย", "คณิตศาสตร์", "ภาษาอังกฤษ", "วิทยาศาสตร์", "สังคมศึกษา", "ศิลปะ", "สุขศึกษา", "การงานอาชีพ"],
    "ม.1/1": ["คณิตศาสตร์", "วิทยาศาสตร์", "ภาษาไทย", "ภาษาอังกฤษ", "สังคมศึกษา", "ประวัติศาสตร์", "ศิลปะ", "สุขศึกษา"],
}
_TIMETABLE_TEACHERS: dict[str, str] = {
    "คณิตศาสตร์": "ครูนภา แก้วใส",
    "ภาษาไทย": "ครูสมหญิง ใจดี",
    "วิทยาศาสตร์": "ครูสมชาย มากมี",
    "ภาษาอังกฤษ": "ครูแอนนา ศรีสุข",
    "สังคมศึกษา": "ครูประเสริฐ สุขสันต์",
    "สุขศึกษา": "ครูสมหญิง ใจดี",
    "ศิลปะ": "ครูจินตนา พรมมา",
    "การงานอาชีพ": "ครูประเสริฐ สุขสันต์",
    "ประวัติศาสตร์": "ครูประเสริฐ สุขสันต์",
}


def timetable() -> dict[str, Any]:
    """Mock weekly timetable (ตารางสอน) — Mon–Fri × 8 periods.

    Each cell carries period/time, subject, class and teacher. Cells are
    assigned deterministically: class rotates across periods, subject comes
    from that class's own weekly rotation shifted by day index.
    """
    classes = list(_TIMETABLE_SCHEDULES.keys())
    grid: dict[str, list[dict[str, Any]]] = {}
    for d in range(5):
        cells: list[dict[str, Any]] = []
        for p in range(8):
            cls = classes[(d + p) % 3]
            subject = _TIMETABLE_SCHEDULES[cls][(d + p) % 8]
            cells.append({
                "period": p + 1,
                "time": _TIMETABLE_PERIODS[p],
                "subject": subject,
                "className": cls,
                "teacher": _TIMETABLE_TEACHERS[subject],
            })
        grid[_TIMETABLE_DAYS[d]] = cells
    return {
        "days": _TIMETABLE_DAYS,
        "periods": [{"no": i + 1, "time": t} for i, t in enumerate(_TIMETABLE_PERIODS)],
        "grid": grid,
        "generatedBy": "mock-timetable-v1",
    }


# ---------------------------------------------------------------------------
# Mock homework list (การบ้าน)
# ---------------------------------------------------------------------------

def homework_list() -> list[dict[str, Any]]:
    """Mock homework list (การบ้าน) — deterministic, status in
    assigned/submitted/graded. Due dates are offsets from today."""
    today = datetime.date.today()

    def due(days: int) -> str:
        return (today + datetime.timedelta(days=days)).isoformat()

    return [
        {"id": "hw-001", "subject": "คณิตศาสตร์", "className": "ป.5/1",
         "title": "แบบฝึกหัดเศษส่วน บทที่ 5 ข้อ 1–10", "dueDate": due(2), "status": "assigned"},
        {"id": "hw-002", "subject": "ภาษาไทย", "className": "ป.4/1",
         "title": "อ่านจับใจความนิทานเรื่อง กระต่ายกับเต่า แล้วสรุป 5 บรรทัด", "dueDate": due(1), "status": "assigned"},
        {"id": "hw-003", "subject": "วิทยาศาสตร์", "className": "ป.4/1",
         "title": "บันทึกการสังเกตวัฏจักรน้ำรอบบ้าน 7 วัน", "dueDate": due(-2), "status": "submitted"},
        {"id": "hw-004", "subject": "คณิตศาสตร์", "className": "ม.1/1",
         "title": "แบบฝึกหัดสมการเชิงเส้นตัวแปรเดียว ชุดที่ 2 (ข้อ 1–8)", "dueDate": due(-1), "status": "graded"},
        {"id": "hw-005", "subject": "ภาษาอังกฤษ", "className": "ป.5/1",
         "title": "เขียนประโยค Introduce yourself 5 ประโยค", "dueDate": due(3), "status": "assigned"},
        {"id": "hw-006", "subject": "สังคมศึกษา", "className": "ป.4/1",
         "title": "วาดแผนผังครอบครัวพร้อมระบุบทบาทสมาชิก", "dueDate": due(-4), "status": "graded"},
        {"id": "hw-007", "subject": "ภาษาไทย", "className": "ม.1/1",
         "title": "แต่งคำประพันธ์ประเภทกลอนสี่ 1 บท ตามหัวข้อที่กำหนด", "dueDate": due(-3), "status": "submitted"},
    ]


# ---------------------------------------------------------------------------
# Mock online exam runner (ข้อสอบออนไลน์)
# ---------------------------------------------------------------------------

_EXAM_RUNNER_BANK: list[dict[str, Any]] = [
    {"question": "ผลบวกของ 1/2 + 1/4 เท่ากับข้อใด",
     "choices": ["1/6", "3/4", "2/6", "1/8"], "answer": 1},
    {"question": "สี่เหลี่ยมผืนผ้ากว้าง 6 ซม. ยาว 9 ซม. มีพื้นที่กี่ตารางเซนติเมตร",
     "choices": ["54", "15", "30", "45"], "answer": 0},
    {"question": "ข้อใดใช้เครื่องหมายวรรคตอนถูกต้อง",
     "choices": ["เธอไปตลาดหรือยัง", "เธอไปตลาดหรือยัง?", "เธอไปตลาดหรือยัง!", "เธอไปตลาดหรือยัง."], "answer": 1},
    {"question": "น้ำ 1 ลิตร เท่ากับกี่มิลลิลิตร",
     "choices": ["10", "100", "1000", "10000"], "answer": 2},
    {"question": "ข้อใดคือประโยคที่มีส่วนขยายประธาน",
     "choices": ["นกบิน", "นกสีเหลืองบินเร็ว", "นกบินเร็ว", "นกบินไป"], "answer": 1},
]


def exam_runner() -> dict[str, Any]:
    """Mock online exam (ข้อสอบออนไลน์) — picks 3 questions from a built-in
    mini bank in fixed order (deterministic) and returns choice questions
    plus an answer key (choice index per question)."""
    picked = _EXAM_RUNNER_BANK[:3]
    return {
        "id": "exam-run-demo-01",
        "title": "ข้อสอบออนไลน์ชุดสาธิต (คณิตศาสตร์–ภาษาไทย ป.4–ป.5)",
        "subject": "รวมวิชา",
        "questions": [
            {"no": i + 1, "question": q["question"], "choices": q["choices"]}
            for i, q in enumerate(picked)
        ],
        "answerKey": [{"no": i + 1, "answer": q["answer"]} for i, q in enumerate(picked)],
        "totalQuestions": len(picked),
        "generatedBy": "mock-exam-runner-v1",
    }


# ---------------------------------------------------------------------------
# Mock yearly curriculum map (แผนการเรียนรู้รายปี)
# ---------------------------------------------------------------------------

def curriculum_map() -> list[dict[str, Any]]:
    """Mock yearly curriculum map (แผนการเรียนรู้รายปี) — per subject a list
    of units with indicators, week count and status plan/teaching/done."""
    return [
        {"subject": "คณิตศาสตร์", "units": [
            {"title": "หน่วยที่ 1 จำนวนและการบวก ลบ คูณ หาร", "indicators": ["ค1.1 ป.5/1", "ค1.1 ป.5/2"], "weeks": 4, "status": "done"},
            {"title": "หน่วยที่ 2 เศษส่วนและการเปรียบเทียบ", "indicators": ["ค1.1 ป.5/3", "ค1.1 ป.5/4"], "weeks": 5, "status": "teaching"},
            {"title": "หน่วยที่ 3 เรขาคณิตและพื้นที่", "indicators": ["ค2.2 ป.5/1", "ค2.2 ป.5/2"], "weeks": 4, "status": "plan"},
            {"title": "หน่วยที่ 4 สถิติและความน่าจะเป็นเบื้องต้น", "indicators": ["ค3.1 ป.5/1"], "weeks": 3, "status": "plan"},
        ]},
        {"subject": "ภาษาไทย", "units": [
            {"title": "หน่วยที่ 1 การอ่านจับใจความสำคัญ", "indicators": ["ท1.1 ป.4/3"], "weeks": 4, "status": "done"},
            {"title": "หน่วยที่ 2 การเขียนสื่อสารและเรียงความ", "indicators": ["ท2.1 ป.4/1", "ท2.1 ป.4/2"], "weeks": 5, "status": "teaching"},
            {"title": "หน่วยที่ 3 วรรณคดีและวรรณกรรมพื้นบ้าน", "indicators": ["ท5.1 ป.4/1"], "weeks": 4, "status": "plan"},
        ]},
        {"subject": "วิทยาศาสตร์", "units": [
            {"title": "หน่วยที่ 1 วัฏจักรน้ำและอากาศ", "indicators": ["ว3.1 ป.4/2"], "weeks": 5, "status": "teaching"},
            {"title": "หน่วยที่ 2 พืชและสัตว์รอบตัวเรา", "indicators": ["ว1.1 ป.4/1", "ว1.2 ป.4/2"], "weeks": 4, "status": "plan"},
            {"title": "หน่วยที่ 3 แรงและพลังงาน", "indicators": ["ว2.1 ป.4/3"], "weeks": 5, "status": "plan"},
        ]},
    ]


# ---------------------------------------------------------------------------
# Mock PLC feed (ชุมชนแห่งการเรียนรู้ทางวิชาชีพ)
# ---------------------------------------------------------------------------

def plc_feed() -> dict[str, Any]:
    """Mock PLC feed — posts with author, title, body, likes and comments.
    Deterministic list, newest first."""
    return {"posts": [
        {"id": "plc-001", "author": "ครูสมหญิง ใจดี", "title": "เทคนิคสอนเศษส่วนด้วยการตัดกระดาษ",
         "body": "ทดลองใช้การพับ-ตัดกระดาษสอนเศษส่วน ป.5/1 พบว่านักเรียนเข้าใจเรื่องเศษส่วนเท่ากันเร็วขึ้นมาก แนะนำให้ลองใช้ดูครับ/ค่ะ",
         "likes": 12,
         "comments": [
             {"author": "ครูสมชาย มากมี", "body": "ขอลองใช้กับห้องผมสัปดาห์หน้าครับ"},
             {"author": "ครูนภา แก้วใส", "body": "ใช้กับ ม.1 ได้ด้วยไหมคะ"},
         ]},
        {"id": "plc-002", "author": "ครูสมชาย มากมี", "title": "แก้ปัญหานักเรียนขาดเรียนซ้ำด้วยการเยี่ยมบ้าน",
         "body": "เก็บข้อมูลนักเรียนเสี่ยง 5 คน พบสาเหตุหลักคือต้องช่วยงานบ้าน แนวทาง: ปรับการบ้านให้ยืดหยุ่น + ประสานผู้ปกครอง",
         "likes": 8,
         "comments": [
             {"author": "ครูประเสริฐ สุขสันต์", "body": "มีแบบฟอร์มเยี่ยมบ้านให้แชร์ไหมครับ"},
         ]},
        {"id": "plc-003", "author": "ครูนภา แก้วใส", "title": "ใช้บัตรภาพฝึกภาษาอังกฤษ ม.1",
         "body": "แชร์ชุดบัตรภาพคำศัพท์หมวดอาหาร ใช้เล่นเกมจับคู่ได้ทั้งคาบ ครบ 30 คน นักเรียนมีส่วนร่วมดี",
         "likes": 5,
         "comments": []},
    ], "generatedBy": "mock-plc-feed-v1"}


# ---------------------------------------------------------------------------
# Mock classroom research list (วิจัยในชั้นเรียน)
# ---------------------------------------------------------------------------

def research_list() -> list[dict[str, Any]]:
    """Mock classroom research projects (วิจัยในชั้นเรียน) — deterministic
    pretest/posttest averages with computed learning gain."""
    rows = [
        ("r-001", "การพัฒนาผลสัมฤทธิ์เรื่องเศษส่วนด้วยสื่อภาพ สำหรับนักเรียนชั้น ป.5",
         "นางสาวสมหญิง ใจดี", "done", 4.8, 8.2),
        ("r-002", "การเสริมทักษะการอ่านจับใจความด้วยนิทานพื้นบ้าน ชั้น ป.4",
         "นายสมชาย มากมี", "running", 5.2, 7.9),
        ("r-003", "การใช้เกมบัตรภาพพัฒนาคำศัพท์ภาษาอังกฤษ ชั้น ม.1",
         "ครูนภา แก้วใส", "running", 5.6, 8.5),
        ("r-004", "การลดพฤติกรรมมาเรียนสายด้วยระบบเพื่อนช่วยเพื่อน ชั้น ป.5",
         "นายประเสริฐ สุขสันต์", "draft", 6.0, 6.0),
    ]
    return [
        {"id": rid, "title": title, "teacher": teacher, "status": status,
         "pretestAvg": pre, "posttestAvg": post, "gain": round(post - pre, 1)}
        for rid, title, teacher, status, pre, post in rows
    ]


# ---------------------------------------------------------------------------
# Mock media library (สื่อการเรียนรู้)
# ---------------------------------------------------------------------------

def media_library() -> list[dict[str, Any]]:
    """Mock learning media library (สื่อการเรียนรู้) — items with type
    (ใบงาน/สไลด์/วิดีโอ/แบบทดสอบ), subject, grade and download count."""
    return [
        {"id": "md-001", "title": "ใบงานเศษส่วนเท่ากัน ชั้น ป.5", "type": "ใบงาน", "subject": "คณิตศาสตร์", "grade": "ป.5", "downloads": 42},
        {"id": "md-002", "title": "สไลด์สอนวัฏจักรน้ำ ป.4", "type": "สไลด์", "subject": "วิทยาศาสตร์", "grade": "ป.4", "downloads": 35},
        {"id": "md-003", "title": "วิดีโอการอ่านจับใจความสำคัญ (10 นาที)", "type": "วิดีโอ", "subject": "ภาษาไทย", "grade": "ป.4", "downloads": 28},
        {"id": "md-004", "title": "แบบทดสอบท้ายบท สมการเชิงเส้น ม.1", "type": "แบบทดสอบ", "subject": "คณิตศาสตร์", "grade": "ม.1", "downloads": 21},
        {"id": "md-005", "title": "ใบงานคำศัพท์ภาษาอังกฤษหมวดอาหาร", "type": "ใบงาน", "subject": "ภาษาอังกฤษ", "grade": "ม.1", "downloads": 19},
        {"id": "md-006", "title": "สไลด์ประวัติศาสตร์อยุธยาโดยย่อ", "type": "สไลด์", "subject": "สังคมศึกษา", "grade": "ป.5", "downloads": 16},
        {"id": "md-007", "title": "แบบทดสอบอักษรนำ อักษรควบ", "type": "แบบทดสอบ", "subject": "ภาษาไทย", "grade": "ป.4", "downloads": 24},
        {"id": "md-008", "title": "วิดีโอสาธิตการทดลองแม่เหล็ก (3 นาที)", "type": "วิดีโอ", "subject": "วิทยาศาสตร์", "grade": "ป.5", "downloads": 12},
    ]



