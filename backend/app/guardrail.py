"""Guardrail agent — rule-based checks on every agent output before it reaches the teacher.

Checks (v1, deterministic — LLM-judge ตาม Appendix A.9 เป็น target):
1. PII leak: เบอร์โทรไทย / เลขบัตรประชาชน / อีเมล ไม่ควรหลุดในผลลัพธ์
2. Grounding: ถ้า output อ้างตัวเลขคะแนน ต้องมีตัวเลขอยู่ใน input ด้วย (กันข้อมูลหลอน)
3. Human-in-the-loop reminder: ทุก output ต้องมีข้อความเตือนว่าเป็นร่าง
"""

import re

PHONE_RE = re.compile(r"0\d{8,9}(?!\d)")
ID_RE = re.compile(r"\d{13}(?!\d)")
EMAIL_RE = re.compile(r"[\w.+-]+@[\w-]+\.[\w.-]+")
SCORE_RE = re.compile(r"\d+(?:\.\d+)?\s*/\s*\d+")

REQUIRED_REMINDERS = ("ร่าง", "ตรวจทาน", "human-in-the-loop")


def check(output: str, source_input: str) -> tuple[bool, list[str]]:
    warnings: list[str] = []

    for label, pat in (("เบอร์โทร", PHONE_RE), ("เลขบัตรประชาชน", ID_RE), ("อีเมล", EMAIL_RE)):
        if pat.search(output):
            warnings.append(f"ตรวจพบ{label}ในผลลัพธ์ — ควรตัดออกก่อนใช้งาน")

    claimed = SCORE_RE.findall(output)
    if claimed and not any(part in source_input for part in claimed):
        warnings.append("ผลลัพธ์อ้างตัวเลขคะแนนที่ไม่พบในข้อมูลต้นทาง — ต้องตรวจทานเองก่อนใช้งาน")

    if not any(r in output for r in REQUIRED_REMINDERS):
        warnings.append("ผลลัพธ์ไม่มีข้อความเตือนว่าเป็นร่าง (human-in-the-loop)")

    return len(warnings) == 0, warnings
