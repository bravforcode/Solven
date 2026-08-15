"""Deterministic demo generators for staff/admin features — dev/demo only.

Every generator returns the SAME output for the same input (fixed data, no
randomness) so the demo is reproducible. All data is clearly synthetic (PDPA):
Thai mock names and numbers only — no real people, no real students. These
power the /api/demo/* endpoints that the frontend staff pages consume
(route registration happens later, in a separate workstream).
"""

from __future__ import annotations

from typing import Any

# ---------------------------------------------------------------------------
# Mock staff list (บุคลากร)
# ---------------------------------------------------------------------------


def staff_list() -> list[dict[str, Any]]:
    """Mock school staff (feature: บุคลากร).

    Teachers with วิทยฐานะ (ชำนาญการ / ชำนาญการพิเศษ / เชี่ยวชาญ), subjects,
    weekly workload hours, and a contact phone. Deterministic.
    """
    return [
        {
            "id": "t-001",
            "name": "นางสาวสมหญิง ใจดี",
            "position": "ครู",
            "academicStanding": "ชำนาญการ",
            "subjects": ["คณิตศาสตร์", "วิทยาศาสตร์"],
            "workloadHours": 18,
            "phone": "081-234-0101",
        },
        {
            "id": "t-002",
            "name": "นายสมชาย มากมี",
            "position": "ครู",
            "academicStanding": "ชำนาญการพิเศษ",
            "subjects": ["ภาษาไทย", "สังคมศึกษา"],
            "workloadHours": 16,
            "phone": "081-234-0102",
        },
        {
            "id": "t-003",
            "name": "นายประเสริฐ สุขสันต์",
            "position": "ครู",
            "academicStanding": "ชำนาญการ",
            "subjects": ["ภาษาอังกฤษ"],
            "workloadHours": 20,
            "phone": "081-234-0103",
        },
        {
            "id": "t-004",
            "name": "นางสาวมณีรัตน์ ศรีสุข",
            "position": "ครู",
            "academicStanding": "เชี่ยวชาญ",
            "subjects": ["คณิตศาสตร์"],
            "workloadHours": 14,
            "phone": "081-234-0104",
        },
        {
            "id": "t-005",
            "name": "นายธนกร วงษ์คำ",
            "position": "ครู",
            "academicStanding": "ชำนาญการ",
            "subjects": ["พลศึกษา", "สุขศึกษา"],
            "workloadHours": 19,
            "phone": "081-234-0105",
        },
        {
            "id": "t-006",
            "name": "นางสาวอรอุมา ใจบุญ",
            "position": "ครู",
            "academicStanding": "ชำนาญการพิเศษ",
            "subjects": ["ศิลปะ", "ดนตรี"],
            "workloadHours": 17,
            "phone": "081-234-0106",
        },
    ]


# ---------------------------------------------------------------------------
# Mock leave requests (การลา)
# ---------------------------------------------------------------------------


def leave_requests() -> list[dict[str, Any]]:
    """Mock leave requests (feature: การลา).

    Types: ลาป่วย / ลากิจ / ลาคลอด / ลาพักผ่อน. Status: รออนุมัติ / อนุมัติ /
    ปฏิเสธ. teacherId references staff_list(). Deterministic.
    """
    return [
        {
            "id": "leave-001",
            "teacherId": "t-001",
            "teacherName": "นางสาวสมหญิง ใจดี",
            "type": "ลาป่วย",
            "startDate": "2026-08-18",
            "days": 2,
            "reason": "ปวดท้องเฉียบพลัน พบแพทย์",
            "status": "รออนุมัติ",
        },
        {
            "id": "leave-002",
            "teacherId": "t-002",
            "teacherName": "นายสมชาย มากมี",
            "type": "ลากิจ",
            "startDate": "2026-08-20",
            "days": 1,
            "reason": "ธุระส่วนตัว",
            "status": "อนุมัติ",
        },
        {
            "id": "leave-003",
            "teacherId": "t-005",
            "teacherName": "นายธนกร วงษ์คำ",
            "type": "ลาคลอด",
            "startDate": "2026-09-01",
            "days": 45,
            "reason": "คลอดบุตร (ภรรยา)",
            "status": "อนุมัติ",
        },
        {
            "id": "leave-004",
            "teacherId": "t-003",
            "teacherName": "นายประเสริฐ สุขสันต์",
            "type": "ลาพักผ่อน",
            "startDate": "2026-08-24",
            "days": 3,
            "reason": "พักผ่อนประจำปี",
            "status": "รออนุมัติ",
        },
        {
            "id": "leave-005",
            "teacherId": "t-006",
            "teacherName": "นางสาวอรอุมา ใจบุญ",
            "type": "ลาป่วย",
            "startDate": "2026-08-17",
            "days": 1,
            "reason": "พบแพทย์นัดตรวจ",
            "status": "ปฏิเสธ",
        },
    ]


# ---------------------------------------------------------------------------
# Mock ว.PA teacher evaluation (ประเมิน ว.PA)
# ---------------------------------------------------------------------------

_EVAL_CRITERIA: list[dict[str, Any]] = [
    {
        "id": "ev-c1",
        "name": "ด้านการจัดการเรียนรู้",
        "weightPct": 40,
        "selfScore": 95,
        "evidence": [
            "แผนการจัดการเรียนรู้ที่เน้นผู้เรียนเป็นสำคัญ",
            "ชิ้นงาน/ร่องรอยการเรียนรู้ของนักเรียน",
        ],
    },
    {
        "id": "ev-c2",
        "name": "ด้านการบริหารจัดการชั้นเรียน",
        "weightPct": 20,
        "selfScore": 90,
        "evidence": [
            "บันทึกหลังสอนและสถิติการมาเรียน",
            "ภาพบรรยากาศชั้นเรียนเชิงบวก",
        ],
    },
    {
        "id": "ev-c3",
        "name": "ด้านการพัฒนาตนเองและวิชาชีพ",
        "weightPct": 20,
        "selfScore": 88,
        "evidence": [
            "เกียรติบัตรการเข้าร่วมอบรม",
            "รายงานการประเมินตนเอง (SAR)",
        ],
    },
    {
        "id": "ev-c4",
        "name": "ด้านการมีส่วนร่วมกับชุมชนการเรียนรู้",
        "weightPct": 20,
        "selfScore": 92,
        "evidence": [
            "บันทึก PLC รายสัปดาห์",
            "ภาพกิจกรรมร่วมกับชุมชน",
        ],
    },
]


def teacher_eval() -> dict[str, Any]:
    """Mock ว.PA self-evaluation (feature: ประเมิน ว.PA).

    Weighted totalScore is computed from the criteria (deterministic), then
    mapped to a level: ดีเด่น (>=90) / ดี (>=75) / พอใช้ (>=60) / ปรับปรุง.
    """
    criteria = _EVAL_CRITERIA
    total = round(sum(c["weightPct"] * c["selfScore"] / 100.0 for c in criteria), 1)
    if total >= 90:
        level = "ดีเด่น"
    elif total >= 75:
        level = "ดี"
    elif total >= 60:
        level = "พอใช้"
    else:
        level = "ปรับปรุง"
    return {
        "teacher": {"id": "t-001", "name": "นางสาวสมหญิง ใจดี"},
        "criteria": criteria,
        "summary": {"totalScore": total, "level": level},
        "generatedBy": "mock-teacher-eval-v1",
    }


# ---------------------------------------------------------------------------
# Mock budget + inventory (งบประมาณ/พัสดุ)
# ---------------------------------------------------------------------------


def budget_inventory() -> dict[str, Any]:
    """Mock budget (งบประมาณ) + inventory (พัสดุ).

    budget rows: allocated vs spent in baht. inventory items with condition
    ดี / ชำรุด / ซ่อม (อยู่ระหว่างซ่อม). Deterministic.
    """
    return {
        "budget": [
            {"category": "วัสดุการศึกษา", "allocated": 120000, "spent": 86500},
            {"category": "ครุภัณฑ์", "allocated": 250000, "spent": 120000},
            {"category": "อาหารกลางวัน", "allocated": 480000, "spent": 245000},
            {"category": "ค่าสาธารณูปโภค", "allocated": 60000, "spent": 42500},
            {"category": "กิจกรรมพัฒนาผู้เรียน", "allocated": 80000, "spent": 15000},
        ],
        "inventory": [
            {"id": "inv-001", "name": "เครื่องพิมพ์เลเซอร์", "category": "ครุภัณฑ์", "quantity": 3, "condition": "ดี"},
            {"id": "inv-002", "name": "คอมพิวเตอร์ตั้งโต๊ะ", "category": "ครุภัณฑ์", "quantity": 12, "condition": "ดี"},
            {"id": "inv-003", "name": "โปรเจกเตอร์", "category": "ครุภัณฑ์", "quantity": 5, "condition": "ซ่อม"},
            {"id": "inv-004", "name": "โต๊ะนักเรียน", "category": "ครุภัณฑ์", "quantity": 80, "condition": "ชำรุด"},
            {"id": "inv-005", "name": "กระดาษ A4", "category": "วัสดุ", "quantity": 45, "condition": "ดี"},
            {"id": "inv-006", "name": "สีโปสเตอร์", "category": "วัสดุ", "quantity": 60, "condition": "ดี"},
            {"id": "inv-007", "name": "พัดลมเพดาน", "category": "ครุภัณฑ์", "quantity": 10, "condition": "ซ่อม"},
        ],
        "generatedBy": "mock-budget-inventory-v1",
    }


# ---------------------------------------------------------------------------
# Mock library (ห้องสมุด)
# ---------------------------------------------------------------------------


def library_books() -> dict[str, Any]:
    """Mock library catalog + active loans (feature: ห้องสมุด).

    books: available in-library. loans: bookId references books, studentId
    references the demo roster students. Deterministic.
    """
    books = [
        {"id": "lib-001", "title": "นิทานอีสป ฉบับเยาวชน", "author": "กรมพระยาดำรงราชานุภาพ (เรียบเรียง)", "isbn": "978-974-123-001-1", "category": "นิทาน", "available": True},
        {"id": "lib-002", "title": "หนังสือเรียนคณิตศาสตร์ ป.4", "author": "สสวท.", "isbn": "978-974-123-002-8", "category": "วิชาการ", "available": True},
        {"id": "lib-003", "title": "พจนานุกรมไทยฉบับนักเรียน", "author": "ราชบัณฑิตยสภา", "isbn": "978-974-123-003-5", "category": "อ้างอิง", "available": False},
        {"id": "lib-004", "title": "วิทยาศาสตร์รอบตัวเรา", "author": "สำนักพิมพ์ห้องเรียน", "isbn": "978-974-123-004-2", "category": "วิทยาศาสตร์", "available": True},
        {"id": "lib-005", "title": "พระอภัยมณี (ฉบับเยาวชน)", "author": "สุนทรภู่", "isbn": "978-974-123-005-9", "category": "วรรณกรรม", "available": True},
        {"id": "lib-006", "title": "โลกใบเล็กของน้องแมว", "author": "นักเขียนตัวอย่าง", "isbn": "978-974-123-006-6", "category": "นิทาน", "available": True},
        {"id": "lib-007", "title": "แบบฝึกหัดภาษาอังกฤษ ป.5", "author": "ฝ่ายวิชาการ", "isbn": "978-974-123-007-3", "category": "วิชาการ", "available": False},
        {"id": "lib-008", "title": "สารานุกรมไทยสำหรับเยาวชน เล่ม 1", "author": "โครงการสารานุกรมไทย", "isbn": "978-974-123-008-0", "category": "อ้างอิง", "available": True},
    ]
    loans = [
        {"bookId": "lib-003", "studentId": "s-001", "borrowDate": "2026-08-10", "dueDate": "2026-08-24", "returned": False},
        {"bookId": "lib-007", "studentId": "s-007", "borrowDate": "2026-08-12", "dueDate": "2026-08-26", "returned": False},
        {"bookId": "lib-002", "studentId": "s-012", "borrowDate": "2026-08-05", "dueDate": "2026-08-19", "returned": True},
    ]
    return {
        "books": books,
        "loans": loans,
        "generatedBy": "mock-library-v1",
    }


# ---------------------------------------------------------------------------
# Mock lunch menu (อาหารกลางวัน)
# ---------------------------------------------------------------------------

_LUNCH_WEEK: list[dict[str, Any]] = [
    {"day": "จันทร์", "menu": ["ข้าวผัดไก่", "ผักสด", "น้ำผลไม้"], "ingredientCost": 1250, "perHead": 35},
    {"day": "อังคาร", "menu": ["ก๋วยเตี๋ยวน้ำใส", "ไข่ต้ม", "ผลไม้ตามฤดูกาล"], "ingredientCost": 980, "perHead": 32},
    {"day": "พุธ", "menu": ["ข้าวมันไก่", "ซุปฟักทอง", "นมจืด"], "ingredientCost": 1350, "perHead": 36},
    {"day": "พฤหัสบดี", "menu": ["ผัดไทยกุ้งสด", "ถั่วงอก", "ส้ม"], "ingredientCost": 1420, "perHead": 38},
    {"day": "ศุกร์", "menu": ["ข้าวราดแกงเขียวหวานไก่", "ไข่เจียว", "แตงโม"], "ingredientCost": 1180, "perHead": 34},
]


def lunch_menu() -> dict[str, Any]:
    """Mock weekly lunch menu (feature: อาหารกลางวัน).

    weeklyCost is summed from each day's ingredientCost (deterministic).
    studentCount is the demo school size.
    """
    return {
        "weekMenu": _LUNCH_WEEK,
        "studentCount": 245,
        "weeklyCost": sum(day["ingredientCost"] for day in _LUNCH_WEEK),
        "generatedBy": "mock-lunch-menu-v1",
    }


# ---------------------------------------------------------------------------
# Mock facility requests (อาคารสถานที่)
# ---------------------------------------------------------------------------


def facility_requests() -> dict[str, Any]:
    """Mock facility management (feature: อาคารสถานที่).

    requests: maintenance tickets with priority ต่ำ / กลาง / สูง and status
    รอซ่อม / ซ่อมเสร็จ. rooms: condition + last inspection date. Deterministic.
    """
    return {
        "requests": [
            {"id": "fr-001", "room": "ห้องเรียน ป.4/1", "issue": "พัดลมเพดานหมุนดังและสั่น", "priority": "สูง", "status": "รอซ่อม"},
            {"id": "fr-002", "room": "ห้องน้ำชาย ชั้น 1", "issue": "ก๊อกน้ำรั่ว", "priority": "กลาง", "status": "ซ่อมเสร็จ"},
            {"id": "fr-003", "room": "ห้องสมุด", "issue": "หลอดไฟสว่างน้อย", "priority": "ต่ำ", "status": "รอซ่อม"},
            {"id": "fr-004", "room": "สนามกีฬา", "issue": "ตาข่ายฟุตบอลฉีกขาด", "priority": "กลาง", "status": "รอซ่อม"},
        ],
        "rooms": [
            {"name": "ห้องเรียน ป.4/1", "condition": "ดี", "lastInspection": "2026-07-15"},
            {"name": "ห้องเรียน ป.5/1", "condition": "ดี", "lastInspection": "2026-07-15"},
            {"name": "ห้องเรียน ม.1/1", "condition": "พอใช้", "lastInspection": "2026-06-28"},
            {"name": "ห้องสมุด", "condition": "พอใช้", "lastInspection": "2026-06-28"},
            {"name": "ห้องน้ำนักเรียน", "condition": "ชำรุด", "lastInspection": "2026-06-10"},
            {"name": "สนามกีฬา", "condition": "ดี", "lastInspection": "2026-08-01"},
        ],
        "generatedBy": "mock-facilities-v1",
    }
