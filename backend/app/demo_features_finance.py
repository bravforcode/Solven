"""Deterministic demo finance feature generators — dev/demo only (never production).

Finance workstream: ค่าเทอม (tuition), QR PromptPay, กองทุน/สหกรณ์ (coop),
เงินเดือน (payroll) and รายงานการเงิน (finance report). Same rules as
demo_features.py: every generator returns the SAME output for the same input
(no randomness), all data is synthetic (PDPA), money is in THB (บาท).
These power the /api/demo/* endpoints that the frontend demo pages consume.
"""

from __future__ import annotations

import datetime
from typing import Any


# ---------------------------------------------------------------------------
# Mock tuition invoices (ค่าเทอม)
# ---------------------------------------------------------------------------

def tuition_invoices() -> list[dict[str, Any]]:
    """Mock tuition invoices (feature: ค่าเทอม) — 6 students, deterministic.

    total is computed from items so amounts stay consistent. Status is
    derived deterministically from paid vs total and the due date:
    ชำระแล้ว / รอชำระ / ค้างชำระ.
    """
    rows: list[dict[str, Any]] = [
        {
            "id": "inv-001",
            "studentId": "s-001",
            "studentName": "เด็กชายสมชาย ใจดี",
            "className": "ป.4/1",
            "term": "ภาคเรียนที่ 1/2569",
            "items": [
                {"name": "ค่าเล่าเรียน", "amount": 4000},
                {"name": "ค่าหนังสือเรียน", "amount": 800},
                {"name": "ค่าเครื่องแบบ", "amount": 600},
                {"name": "ค่ากิจกรรมเสริม", "amount": 500},
                {"name": "ค่าประกันอุบัติเหตุ", "amount": 100},
            ],
            "paid": 6000,
            "dueDate": "2569-05-15",
        },
        {
            "id": "inv-002",
            "studentId": "s-002",
            "studentName": "เด็กหญิงสมหญิง รักเรียน",
            "className": "ป.4/1",
            "term": "ภาคเรียนที่ 1/2569",
            "items": [
                {"name": "ค่าเล่าเรียน", "amount": 4000},
                {"name": "ค่าหนังสือเรียน", "amount": 800},
                {"name": "ค่าเครื่องแบบ", "amount": 600},
                {"name": "ค่ากิจกรรมเสริม", "amount": 500},
                {"name": "ค่าประกันอุบัติเหตุ", "amount": 100},
            ],
            "paid": 6000,
            "dueDate": "2569-05-15",
        },
        {
            "id": "inv-003",
            "studentId": "s-003",
            "studentName": "เด็กชายอนุชา แซ่ลี้",
            "className": "ป.4/1",
            "term": "ภาคเรียนที่ 1/2569",
            "items": [
                {"name": "ค่าเล่าเรียน", "amount": 4000},
                {"name": "ค่าหนังสือเรียน", "amount": 800},
                {"name": "ค่าเครื่องแบบ", "amount": 600},
                {"name": "ค่ากิจกรรมเสริม", "amount": 500},
                {"name": "ค่าประกันอุบัติเหตุ", "amount": 100},
            ],
            "paid": 3500,
            "dueDate": "2569-06-15",
        },
        {
            "id": "inv-004",
            "studentId": "s-006",
            "studentName": "เด็กหญิงกนกพร ทองดี",
            "className": "ป.5/1",
            "term": "ภาคเรียนที่ 1/2569",
            "items": [
                {"name": "ค่าเล่าเรียน", "amount": 4200},
                {"name": "ค่าหนังสือเรียน", "amount": 850},
                {"name": "ค่าเครื่องแบบ", "amount": 650},
                {"name": "ค่ากิจกรรมเสริม", "amount": 500},
                {"name": "ค่าประกันอุบัติเหตุ", "amount": 100},
            ],
            "paid": 2000,
            "dueDate": "2569-06-15",
        },
        {
            "id": "inv-005",
            "studentId": "s-007",
            "studentName": "เด็กชายวรเมธ กล้าหาญ",
            "className": "ป.5/1",
            "term": "ภาคเรียนที่ 1/2569",
            "items": [
                {"name": "ค่าเล่าเรียน", "amount": 4200},
                {"name": "ค่าหนังสือเรียน", "amount": 850},
                {"name": "ค่าเครื่องแบบ", "amount": 650},
                {"name": "ค่ากิจกรรมเสริม", "amount": 500},
                {"name": "ค่าประกันอุบัติเหตุ", "amount": 100},
            ],
            "paid": 0,
            "dueDate": "2569-04-30",
        },
        {
            "id": "inv-006",
            "studentId": "s-011",
            "studentName": "เด็กชายกิตติพงษ์ แก้วใส",
            "className": "ม.1/1",
            "term": "ภาคเรียนที่ 1/2569",
            "items": [
                {"name": "ค่าเล่าเรียน", "amount": 4500},
                {"name": "ค่าหนังสือเรียน", "amount": 950},
                {"name": "ค่าเครื่องแบบ", "amount": 700},
                {"name": "ค่ากิจกรรมเสริม", "amount": 550},
                {"name": "ค่าประกันอุบัติเหตุ", "amount": 100},
            ],
            "paid": 0,
            "dueDate": "2569-04-30",
        },
    ]
    for inv in rows:
        inv["total"] = sum(item["amount"] for item in inv["items"])
        if inv["paid"] >= inv["total"]:
            inv["status"] = "ชำระแล้ว"
        elif inv["paid"] > 0:
            inv["status"] = "รอชำระ"
        else:
            inv["status"] = "ค้างชำระ"
        inv["remaining"] = inv["total"] - inv["paid"]
    return rows


# ---------------------------------------------------------------------------
# Mock PromptPay QR payload (สร้าง QR PromptPay)
# ---------------------------------------------------------------------------

def _tlv(tag: str, value: str) -> str:
    """EMVCo TLV: tag + 2-digit byte length + value."""
    return f"{tag}{len(value.encode('utf-8')):02d}{value}"


def _crc16_ccitt(data: bytes) -> int:
    """EMVCo CRC-16/CCITT (poly 0x1021, init 0xFFFF, MSB-first)."""
    crc = 0xFFFF
    for byte in data:
        crc ^= byte << 8
        for _ in range(8):
            if crc & 0x8000:
                crc = ((crc << 1) ^ 0x1021) & 0xFFFF
            else:
                crc = (crc << 1) & 0xFFFF
    return crc


def promptpay_payload(amount: float, ref: str) -> dict[str, Any]:
    """Deterministic EMVCo-style PromptPay QR payload (Thai domestic merchant).

    Same input → same payload: static prefix (payload format indicator, P2P
    merchant info tag 29, THB currency tag 53) wraps the dynamic amount and
    reference, then the merchant/city/bill-info suffix and a computed CRC-16.
    Amount is rounded to 2 decimals; ref is embedded in bill-info tag 62.
    """
    amount_str = f"{round(amount, 2):.2f}"
    merchant = "โรงเรียนสวนฝั่งสุข"
    city = "กรุงเทพมหานคร"
    biller_id = "0994000567891"  # synthetic TAX ID (PDPA-safe)
    mobile = "0066812345678"  # synthetic mobile (PDPA-safe)
    tag_29 = _tlv("29", "0016A000000677010111" + "0113" + mobile)
    tag_54 = _tlv("54", amount_str)
    tag_59 = _tlv("59", merchant)
    tag_60 = _tlv("60", city)
    tag_62 = _tlv("62", _tlv("01", biller_id) + _tlv("07", ref))
    body = "000201010211" + tag_29 + "5303764" + tag_54 + "5802TH" + tag_59 + tag_60 + tag_62
    crc = _crc16_ccitt((body + "6304").encode("utf-8"))
    return {
        "payload": body + "6304" + f"{crc:04X}",
        "amount": round(amount, 2),
        "ref": ref,
        "generatedBy": "mock-promptpay-v1",
    }


# ---------------------------------------------------------------------------
# Mock coop / savings fund (กองทุน/สหกรณ์)
# ---------------------------------------------------------------------------

def coop_accounts() -> dict[str, Any]:
    """Mock coop/savings fund (feature: กองทุน/สหกรณ์) — deterministic.

    Members hold savings + shares (หุ้น) and may have 0-2 loans with a
    fixed interest rate and due date. totalSavings is the computed sum.
    """
    members: list[dict[str, Any]] = [
        {
            "id": "c-001",
            "name": "นายสมชาย มากมี",
            "savings": 85000,
            "shares": 120,
            "loans": [
                {"amount": 50000, "remaining": 32000, "interestPct": 6.5, "dueDate": "2569-12-20"},
            ],
            "status": "ปกติ",
        },
        {
            "id": "c-002",
            "name": "นางสาวสมหญิง ใจดี",
            "savings": 64000,
            "shares": 90,
            "loans": [],
            "status": "ปกติ",
        },
        {
            "id": "c-003",
            "name": "นายประเสริฐ สุขสันต์",
            "savings": 92000,
            "shares": 150,
            "loans": [
                {"amount": 30000, "remaining": 12500, "interestPct": 6.5, "dueDate": "2569-11-15"},
                {"amount": 20000, "remaining": 20000, "interestPct": 7.0, "dueDate": "2569-09-30"},
            ],
            "status": "ปกติ",
        },
        {
            "id": "c-004",
            "name": "นางกนกพร ทองดี",
            "savings": 21000,
            "shares": 40,
            "loans": [
                {"amount": 25000, "remaining": 18000, "interestPct": 6.5, "dueDate": "2569-10-10"},
            ],
            "status": "สมาชิกใหม่",
        },
        {
            "id": "c-005",
            "name": "นายวรเมธ กล้าหาญ",
            "savings": 4500,
            "shares": 5,
            "loans": [],
            "status": "รออนุมัติ",
        },
    ]
    return {
        "members": members,
        "totalSavings": sum(m["savings"] for m in members),
        "generatedAt": datetime.datetime.now(datetime.timezone.utc).isoformat(),
        "generatedBy": "mock-coop-v1",
    }


# ---------------------------------------------------------------------------
# Mock payroll (เงินเดือน)
# ---------------------------------------------------------------------------

def payroll() -> dict[str, Any]:
    """Mock payroll (feature: เงินเดือน) — deterministic.

    net = base + allowances − deductions, computed per employee so totals
    stay consistent. Status is fixed per employee (จ่ายแล้ว / รอจ่าย).
    """
    employees: list[dict[str, Any]] = [
        {
            "id": "e-001",
            "name": "นายสวัสดิ์ ผู้อำนวยการ",
            "position": "ผู้อำนวยการ",
            "baseSalary": 35000,
            "allowances": [
                {"name": "เงินเพิ่มค่าครองชีพ", "amount": 2000},
                {"name": "ค่าวิทยฐานะ", "amount": 2500},
            ],
            "deductions": [
                {"name": "ภาษีเงินได้", "amount": 4200},
                {"name": "ประกันสังคม", "amount": 750},
            ],
            "status": "จ่ายแล้ว",
        },
        {
            "id": "e-002",
            "name": "นายสมชาย มากมี",
            "position": "ครูชำนาญการ",
            "baseSalary": 28000,
            "allowances": [
                {"name": "เงินเพิ่มค่าครองชีพ", "amount": 1800},
                {"name": "ค่าวิทยฐานะ", "amount": 2500},
            ],
            "deductions": [
                {"name": "ภาษีเงินได้", "amount": 2900},
                {"name": "ประกันสังคม", "amount": 750},
            ],
            "status": "จ่ายแล้ว",
        },
        {
            "id": "e-003",
            "name": "นายประเสริฐ สุขสันต์",
            "position": "ครูชำนาญการ",
            "baseSalary": 28000,
            "allowances": [
                {"name": "เงินเพิ่มค่าครองชีพ", "amount": 1800},
                {"name": "ค่าวิทยฐานะ", "amount": 2000},
            ],
            "deductions": [
                {"name": "ภาษีเงินได้", "amount": 2900},
                {"name": "ประกันสังคม", "amount": 750},
            ],
            "status": "จ่ายแล้ว",
        },
        {
            "id": "e-004",
            "name": "นางสาวสมหญิง ใจดี",
            "position": "ครูผู้ช่วย",
            "baseSalary": 22000,
            "allowances": [
                {"name": "เงินเพิ่มค่าครองชีพ", "amount": 1500},
            ],
            "deductions": [
                {"name": "ภาษีเงินได้", "amount": 1800},
                {"name": "ประกันสังคม", "amount": 750},
            ],
            "status": "รอจ่าย",
        },
        {
            "id": "e-005",
            "name": "นางสาวบุญช่วย งานดี",
            "position": "เจ้าหน้าที่ธุรการ",
            "baseSalary": 18500,
            "allowances": [
                {"name": "เงินเพิ่มค่าครองชีพ", "amount": 1200},
            ],
            "deductions": [
                {"name": "ภาษีเงินได้", "amount": 1200},
                {"name": "ประกันสังคม", "amount": 750},
            ],
            "status": "รอจ่าย",
        },
    ]
    for emp in employees:
        emp["allowanceTotal"] = sum(a["amount"] for a in emp["allowances"])
        emp["deductionTotal"] = sum(d["amount"] for d in emp["deductions"])
        emp["net"] = emp["baseSalary"] + emp["allowanceTotal"] - emp["deductionTotal"]
    return {
        "employees": employees,
        "totals": {
            "base": sum(e["baseSalary"] for e in employees),
            "allowances": sum(e["allowanceTotal"] for e in employees),
            "deductions": sum(e["deductionTotal"] for e in employees),
            "net": sum(e["net"] for e in employees),
        },
        "month": "กรกฎาคม 2569",
        "generatedAt": datetime.datetime.now(datetime.timezone.utc).isoformat(),
        "generatedBy": "mock-payroll-v1",
    }


# ---------------------------------------------------------------------------
# Mock finance summary (รายงานการเงิน)
# ---------------------------------------------------------------------------

def finance_summary(period: str = "ไตรมาส 3/2569 (มี.ค.–พ.ค. 2569)") -> dict[str, Any]:
    """Mock finance report (feature: รายงานการเงิน) — deterministic.

    Monthly income/expense are chosen so the 6-month sums exactly match the
    income/expense category totals and balance = income − expense.
    """
    income = [
        {"category": "ค่าเทอม", "amount": 320000},
        {"category": "ค่าธรรมเนียมการศึกษา", "amount": 45000},
        {"category": "เงินบริจาค", "amount": 20000},
        {"category": "รายได้อื่น", "amount": 8500},
    ]
    expense = [
        {"category": "เงินเดือนบุคลากร", "amount": 210000},
        {"category": "ค่าวัสดุการเรียน", "amount": 35000},
        {"category": "ค่าสาธารณูปโภค", "amount": 28000},
        {"category": "ซ่อมแซมอาคารสถานที่", "amount": 12000},
    ]
    months = [
        {"month": "มี.ค. 2569", "income": 61000, "expense": 45500},
        {"month": "เม.ย. 2569", "income": 42500, "expense": 51000},
        {"month": "พ.ค. 2569", "income": 68000, "expense": 47000},
        {"month": "มิ.ย. 2569", "income": 72000, "expense": 52000},
        {"month": "ก.ค. 2569", "income": 71500, "expense": 48000},
        {"month": "ส.ค. 2569", "income": 70500, "expense": 41500},
    ]
    total_income = sum(i["amount"] for i in income)
    total_expense = sum(e["amount"] for e in expense)
    return {
        "period": period,
        "income": income,
        "expense": expense,
        "incomeTotal": total_income,
        "expenseTotal": total_expense,
        "balance": total_income - total_expense,
        "months": months,
        "generatedAt": datetime.datetime.now(datetime.timezone.utc).isoformat(),
        "generatedBy": "mock-finance-summary-v1",
    }
