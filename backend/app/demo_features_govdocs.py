"""Deterministic demo generators — งานสารบรรณ/ราชการ (govdocs workstream).

Dev/demo only (never production). Every generator returns the SAME output for
the same input (no randomness, fixed dates) so the demo is reproducible.
All data is synthetic (PDPA): no real documents, students, or schools.

Power source for the /api/demo/doc-register, /api/demo/edoc-workflow,
/api/demo/obec-reports and /api/demo/procurement endpoints (routing is wired
up later — this module only defines generators, stdlib imports only).
"""

from __future__ import annotations

from typing import Any

# ---------------------------------------------------------------------------
# ทะเบียนหนังสือราชการเข้า-ออก (doc_register)
# ---------------------------------------------------------------------------

_DOC_REGISTER: list[dict[str, Any]] = [
    {"id": "reg-001", "regNo": "ที่ ศธ 04001/2501", "type": "รับ", "from": "สำนักงานเขตพื้นที่การศึกษาประถมศึกษาสุโขทัย เขต 2",
     "to": "ผู้อำนวยการโรงเรียนบ้านสวนฝั่งสุข", "subject": "แจ้งกำหนดการประชุมผู้บริหารสถานศึกษา ครั้งที่ 8/2569",
     "date": "2026-08-14", "status": "ลงนามแล้ว"},
    {"id": "reg-002", "regNo": "ที่ ศธ 04001/2502", "type": "รับ", "from": "สำนักงานคณะกรรมการการศึกษาขั้นพื้นฐาน (สพฐ.)",
     "to": "โรงเรียนบ้านสวนฝั่งสุข", "subject": "แนวปฏิบัติการกรอกข้อมูลนักเรียนในระบบ DMC ปีการศึกษา 2569",
     "date": "2026-08-13", "status": "รอลงนาม"},
    {"id": "reg-003", "regNo": "ที่ ศธ 04001/2503", "type": "ส่ง", "from": "โรงเรียนบ้านสวนฝั่งสุข",
     "to": "สำนักงานเขตพื้นที่การศึกษาประถมศึกษาสุโขทัย เขต 2", "subject": "ส่งรายงานการใช้อินเทอร์เน็ตในสถานศึกษา ประจำเดือนกรกฎาคม 2569",
     "date": "2026-08-12", "status": "ส่งแล้ว"},
    {"id": "reg-004", "regNo": "ที่ ศธ 04001/2504", "type": "รับ", "from": "องค์การบริหารส่วนจังหวัดสุโขทัย",
     "to": "ผู้อำนวยการโรงเรียนบ้านสวนฝั่งสุข", "subject": "ขอความอนุเคราะห์สถานที่จัดกิจกรรมกีฬาเยาวชนระดับจังหวัด",
     "date": "2026-08-11", "status": "ลงนามแล้ว"},
    {"id": "reg-005", "regNo": "ที่ ศธ 04001/2505", "type": "ส่ง", "from": "โรงเรียนบ้านสวนฝั่งสุข",
     "to": "สำนักงานคณะกรรมการการศึกษาขั้นพื้นฐาน (สพฐ.)", "subject": "ส่งแบบรายงานข้อมูลอาคารเรียนและสิ่งก่อสร้าง (ป.ย.1)",
     "date": "2026-08-08", "status": "ส่งแล้ว"},
    {"id": "reg-006", "regNo": "ที่ ศธ 04001/2506", "type": "รับ", "from": "สำนักงานเขตพื้นที่การศึกษาประถมศึกษาสุโขทัย เขต 2",
     "to": "ครูธุรการโรงเรียนบ้านสวนฝั่งสุข", "subject": "ขอให้จัดส่งสำเนาคำสั่งแต่งตั้งคณะกรรมการดำเนินงานวันเด็กแห่งชาติ 2569",
     "date": "2026-08-07", "status": "รอลงนาม"},
]


def doc_register() -> dict[str, Any]:
    """Mock ทะเบียนหนังสือราชการเข้า-ออก (feature: govdocs).

    Returns the fixed register with summary counts. Deterministic."""
    entries = _DOC_REGISTER
    return {
        "entries": entries,
        "summary": {
            "total": len(entries),
            "incoming": sum(1 for e in entries if e["type"] == "รับ"),
            "outgoing": sum(1 for e in entries if e["type"] == "ส่ง"),
            "pendingSign": sum(1 for e in entries if e["status"] == "รอลงนาม"),
        },
        "generatedBy": "mock-doc-register-v1",
    }


# ---------------------------------------------------------------------------
# สารบรรณอิเล็กทรอนิกส์ (edoc_workflow)
# ---------------------------------------------------------------------------

_EDOC_DOCS: list[dict[str, Any]] = [
    {
        "id": "edoc-001",
        "title": "คำสั่งแต่งตั้งคณะกรรมการจัดทำแผนพัฒนาการศึกษา ปี 2570",
        "kind": "คำสั่ง",
        "creator": "นางสาวสมหญิง ใจดี (หัวหน้ากลุ่มงานบริหารวิชาการ)",
        "status": "อนุมัติแล้ว",
        "steps": [
            {"name": "ร่าง", "done": True, "by": "นางสาวสมหญิง ใจดี", "date": "2026-08-10"},
            {"name": "เสนอ", "done": True, "by": "นางสาวสมหญิง ใจดี", "date": "2026-08-11"},
            {"name": "อนุมัติ", "done": True, "by": "นายประเสริฐ สุขสันต์ (ผู้อำนวยการ)", "date": "2026-08-12"},
            {"name": "ส่ง", "done": True, "by": "นางสาววิไลลักษณ์ ทองดี (ธุรการ)", "date": "2026-08-13"},
        ],
    },
    {
        "id": "edoc-002",
        "title": "บันทึกข้อความขออนุมัติจัดซื้อเครื่องปรับอากาศ ห้องสมุด",
        "kind": "บันทึก",
        "creator": "นายสมชาย มากมี (หัวหน้ากลุ่มงานงบประมาณ)",
        "status": "รออนุมัติ",
        "steps": [
            {"name": "ร่าง", "done": True, "by": "นายสมชาย มากมี", "date": "2026-08-12"},
            {"name": "เสนอ", "done": True, "by": "นายสมชาย มากมี", "date": "2026-08-13"},
            {"name": "อนุมัติ", "done": False, "by": "", "date": ""},
            {"name": "ส่ง", "done": False, "by": "", "date": ""},
        ],
    },
    {
        "id": "edoc-003",
        "title": "ประกาศโรงเรียนเรื่อง การเปิดเรียนภาคเรียนที่ 2 ปีการศึกษา 2569",
        "kind": "ประกาศ",
        "creator": "นายประเสริฐ สุขสันต์ (ผู้อำนวยการ)",
        "status": "รอลงนาม",
        "steps": [
            {"name": "ร่าง", "done": True, "by": "นางสาววิไลลักษณ์ ทองดี (ธุรการ)", "date": "2026-08-14"},
            {"name": "เสนอ", "done": True, "by": "นางสาววิไลลักษณ์ ทองดี (ธุรการ)", "date": "2026-08-14"},
            {"name": "อนุมัติ", "done": False, "by": "", "date": ""},
            {"name": "ส่ง", "done": False, "by": "", "date": ""},
        ],
    },
    {
        "id": "edoc-004",
        "title": "หนังสือเชิญประชุมคณะกรรมการสถานศึกษาขั้นพื้นฐาน ครั้งที่ 3/2569",
        "kind": "หนังสือราชการ",
        "creator": "นางสาววิไลลักษณ์ ทองดี (ธุรการ)",
        "status": "ส่งแล้ว",
        "steps": [
            {"name": "ร่าง", "done": True, "by": "นางสาววิไลลักษณ์ ทองดี", "date": "2026-08-05"},
            {"name": "เสนอ", "done": True, "by": "นางสาววิไลลักษณ์ ทองดี", "date": "2026-08-06"},
            {"name": "อนุมัติ", "done": True, "by": "นายประเสริฐ สุขสันต์ (ผู้อำนวยการ)", "date": "2026-08-07"},
            {"name": "ส่ง", "done": True, "by": "นางสาววิไลลักษณ์ ทองดี", "date": "2026-08-08"},
        ],
    },
]


def edoc_workflow() -> dict[str, Any]:
    """Mock สารบรรณอิเล็กทรอนิกส์ (feature: govdocs).

    Fixed document set with 4-step workflow (ร่าง→เสนอ→อนุมัติ→ส่ง).
    Deterministic."""
    return {
        "docs": _EDOC_DOCS,
        "workflowSteps": ["ร่าง", "เสนอ", "อนุมัติ", "ส่ง"],
        "generatedBy": "mock-edoc-workflow-v1",
    }


# ---------------------------------------------------------------------------
# รายงาน สพฐ./DMC (obec_reports)
# ---------------------------------------------------------------------------

_OBEC_REPORTS: list[dict[str, Any]] = [
    {
        "id": "rep-001",
        "name": "รายงานข้อมูลนักเรียนรายบุคคล (DMC) ภาคเรียนที่ 1/2569",
        "category": "DMC",
        "period": "ภาคเรียนที่ 1/2569",
        "status": "ยังไม่ส่ง",
        "generatedAt": "2026-08-15T09:00:00+07:00",
        "summary": {"students": 15, "teachers": 9, "rooms": 6, "budget": 1250000},
    },
    {
        "id": "rep-002",
        "name": "ข้อมูลพื้นฐานสถานศึกษา (ป.ย.1) ปีการศึกษา 2569",
        "category": "ข้อมูลพื้นฐาน",
        "period": "ปีการศึกษา 2569",
        "status": "ส่งแล้ว",
        "generatedAt": "2026-07-20T10:30:00+07:00",
        "summary": {"students": 15, "teachers": 9, "rooms": 6, "budget": 1250000},
    },
    {
        "id": "rep-003",
        "name": "รายงานผลสัมฤทธิ์ทางการเรียน ภาคเรียนที่ 1/2569",
        "category": "ผลสัมฤทธิ์",
        "period": "ภาคเรียนที่ 1/2569",
        "status": "ยังไม่ส่ง",
        "generatedAt": "2026-08-16T08:00:00+07:00",
        "summary": {"students": 15, "teachers": 9, "rooms": 6, "budget": 1250000},
    },
    {
        "id": "rep-004",
        "name": "รายงานการใช้จ่ายงบประมาณรายหัว ประจำปี 2569",
        "category": "ข้อมูลพื้นฐาน",
        "period": "ปีการศึกษา 2569",
        "status": "ส่งแล้ว",
        "generatedAt": "2026-07-05T14:00:00+07:00",
        "summary": {"students": 15, "teachers": 9, "rooms": 6, "budget": 1250000},
    },
]


def obec_reports() -> dict[str, Any]:
    """Mock รายงาน สพฐ./DMC (feature: govdocs).

    Fixed report set; summary totals are deterministic per report.
    Note: "ยังไม่ส่ง" reports keep generatedAt as the demo-draft time."""
    return {
        "reports": _OBEC_REPORTS,
        "school": "โรงเรียนบ้านสวนฝั่งสุข",
        "obecRegion": "สพป.สุโขทัย เขต 2",
        "generatedBy": "mock-obec-reports-v1",
    }


# ---------------------------------------------------------------------------
# จัดซื้อจัดจ้าง (procurement)
# ---------------------------------------------------------------------------

_PROCUREMENT_ITEMS: list[dict[str, Any]] = [
    {"id": "prc-001", "name": "เครื่องปรับอากาศ ขนาด 18,000 BTU", "category": "ครุภัณฑ์", "qty": 2,
     "unitPrice": 24900, "vendor": "ห้างหุ้นส่วนจำกัด สุโขทัยแอร์เซอร์วิส", "budget": 49800,
     "status": "เปรียบเทียบราคา"},
    {"id": "prc-002", "name": "คอมพิวเตอร์โน้ตบุ๊ก สำหรับห้องสมุด", "category": "ครุภัณฑ์", "qty": 3,
     "unitPrice": 18900, "vendor": "บริษัท ไทยไอทีซัพพลาย จำกัด", "budget": 56700,
     "status": "รอเสนอราคา"},
    {"id": "prc-003", "name": "กระดาษ A4 80 แกรม (รีม)", "category": "วัสดุสำนักงาน", "qty": 60,
     "unitPrice": 110, "vendor": "ร้านสุขใจเครื่องเขียน", "budget": 6600, "status": "จัดซื้อแล้ว"},
    {"id": "prc-004", "name": "หมึกพิมพ์เลเซอร์ (ตลับ)", "category": "วัสดุคอมพิวเตอร์", "qty": 8,
     "unitPrice": 1450, "vendor": "บริษัท ไทยไอทีซัพพลาย จำกัด", "budget": 11600, "status": "อนุมัติ"},
    {"id": "prc-005", "name": "โต๊ะนักเรียนปรับระดับ เก้าอี้คู่", "category": "ครุภัณฑ์", "qty": 10,
     "unitPrice": 2350, "vendor": "หจก.เฟอร์นิเจอร์สุโขทัย", "budget": 23500, "status": "รอเสนอราคา"},
    {"id": "prc-006", "name": "พัดลมติดผนัง 16 นิ้ว", "category": "วัสดุ", "qty": 6,
     "unitPrice": 890, "vendor": "ร้านสุขใจเครื่องเขียน", "budget": 5340, "status": "จัดซื้อแล้ว"},
]


def procurement() -> dict[str, Any]:
    """Mock จัดซื้อจัดจ้าง (feature: govdocs).

    Fixed item list; totalBudget is the deterministic sum of item budgets."""
    items = _PROCUREMENT_ITEMS
    total = sum(item["budget"] for item in items)
    return {
        "items": items,
        "totalBudget": total,
        "fiscalYear": "2569",
        "generatedBy": "mock-procurement-v1",
    }
