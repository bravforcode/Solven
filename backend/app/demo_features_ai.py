"""Deterministic AI-feature demo generators - dev/demo only (never production).

Same contract as demo_features.py: every generator returns the SAME output
for the same input (no randomness), so the demo is reproducible. All data is
clearly synthetic (PDPA): no real student data anywhere.

These power the /api/demo/ai/* endpoints. Routes are NOT registered here -
integration happens in a later step.
"""

from __future__ import annotations

import re
from typing import Any

# ---------------------------------------------------------------------------
# Essay grading (ตรวจเรียงความ)
# ---------------------------------------------------------------------------

_ESSAY_DIM_MAX = 10


def _thai_words(text: str) -> list[str]:
    """Extract Thai words with a fixed regex (deterministic)."""
    return re.findall(r"[ก-๙]{2,}", text or "")


def essay_grade(text: str) -> dict[str, Any]:
    """Mock AI essay grader: 4 dimensions scored by deterministic heuristics
    (length, vocabulary variety, paragraph/marker structure). Same input
    always produces the same result. No randomness."""
    raw = text or ""
    length = len(raw.strip())
    words = _thai_words(raw)
    distinct = len(set(words))
    has_paragraphs = "\n\n" in raw or raw.count("\n") >= 2
    has_markers = any(m in raw for m in ("1)", "2)", "3)", "ประการแรก", "สุดท้าย"))

    content = 8 if length >= 150 else 5 if length >= 60 else 3
    language = 8 if distinct >= 25 else 6 if distinct >= 12 else 4
    structure = 9 if has_paragraphs and has_markers else 7 if has_paragraphs or has_markers else 4
    creativity = 7 if distinct >= 30 and length >= 150 else 6 if distinct >= 15 else 4

    dims = [
        {"name": "เนื้อหา", "score": content, "max": _ESSAY_DIM_MAX,
         "comment": "เนื้อหาครบถ้วน เขียนตรงประเด็นที่กำหนด" if content >= 7 else
                    "มีประเด็นหลักแต่ยังขยายความไม่มากพอ" if content >= 5 else
                    "เนื้อหายังสั้น ควรเพิ่มรายละเอียดและตัวอย่าง"},
        {"name": "ภาษา", "score": language, "max": _ESSAY_DIM_MAX,
         "comment": "ใช้คำหลากหลาย ถูกต้องตามหลักภาษา" if language >= 7 else
                    "ภาษาโดยรวมใช้ได้ ควรเพิ่มคำเชื่อมและคำศัพท์" if language >= 5 else
                    "ควรฝึกใช้คำให้ถูกต้องและหลากหลายขึ้น"},
        {"name": "โครงสร้าง", "score": structure, "max": _ESSAY_DIM_MAX,
         "comment": "จัดย่อหน้าชัดเจน มีลำดับการนำเสนอ" if structure >= 7 else
                    "ควรจัดย่อหน้าและลำดับเนื้อหาให้ชัดเจนขึ้น" if structure >= 5 else
                    "ยังไม่พบการแบ่งย่อหน้า ควรฝึกวางโครงสร้างเรื่อง"},
        {"name": "ความคิดสร้างสรรค์", "score": creativity, "max": _ESSAY_DIM_MAX,
         "comment": "มีแนวคิดน่าสนใจ ใช้ภาษาเพื่อสื่ออารมณ์ได้ดี" if creativity >= 7 else
                    "มีความคิดสร้างสรรค์พอควร ต่อยอดได้อีก" if creativity >= 5 else
                    "ควรลองเพิ่มมุมมองใหม่ๆ ในการเขียน"},
    ]

    total = sum(d["score"] for d in dims)
    if total >= 34:
        grade = "ดีเยี่ยม"
    elif total >= 26:
        grade = "ดี"
    elif total >= 18:
        grade = "พอใช้"
    else:
        grade = "ปรับปรุง"

    weak = [d["name"] for d in dims if d["score"] < 5]
    suggestions: list[str] = []
    if weak:
        suggestions.append(f"ควรฝึกด้าน{' '.join(weak)}: ลองเขียนวันละ 5-10 ประโยค")
    if length < 150:
        suggestions.append("ขยายความแต่ละย่อหน้าให้ละเอียดขึ้น (แนะนำอย่างน้อย 150 ตัวอักษร)")
    if not has_paragraphs:
        suggestions.append("แบ่งย่อหน้าเป็น 3 ส่วน: นำเรื่อง - เนื้อเรื่อง - สรุป")
    if distinct < 25:
        suggestions.append("เพิ่มคำศัพท์และคำเชื่อมเพื่อให้ภาษาไหลลื่นขึ้น")
    if not suggestions:
        suggestions.append("ผลงานดีมาก ลองเขียนหัวข้อที่ท้าทายขึ้นในครั้งหน้า")

    return {
        "dims": dims,
        "totalScore": total,
        "totalMax": _ESSAY_DIM_MAX * len(dims),
        "grade": grade,
        "suggestions": suggestions,
        "generatedBy": "mock-essay-grader-v1",
    }


# ---------------------------------------------------------------------------
# AI สร้างสื่อ (media generator)
# ---------------------------------------------------------------------------

def media_generate(topic: str) -> dict[str, Any]:
    """Mock AI slide-deck generator: 4 fixed slides + narration script +
    image ideas. Deterministic - only the topic string is interpolated."""
    t = (topic or "การเรียนรู้").strip() or "การเรียนรู้"
    slides = [
        {"title": f"บทนำ: {t}",
         "bullets": ["เกริ่นนำด้วยคำถามชวนคิด", "บอกวัตถุประสงค์การเรียนรู้", "เชื่อมโยงกับประสบการณ์ของนักเรียน"]},
        {"title": f"เนื้อหาหลัก: {t}",
         "bullets": ["แนวคิดสำคัญของเนื้อหา", "ตัวอย่างประกอบ 2-3 ตัวอย่าง", "คำศัพท์หรือสูตรที่ต้องจำ"]},
        {"title": "กิจกรรมในชั้นเรียน",
         "bullets": ["เกมหรือแบบฝึกหัดกลุ่ม", "คำถามให้อภิปรายร่วมกัน", "ใบงานท้ายชั่วโมง"]},
        {"title": "สรุปบทเรียน",
         "bullets": ["สรุปประเด็นสำคัญ 3 ข้อ", "ตรวจสอบความเข้าใจด้วยคำถามสั้นๆ", "การบ้านและแหล่งเรียนรู้เพิ่มเติม"]},
    ]
    script = (
        f"สไลด์ 1 — เปิดชั่วโมงด้วยคำถาม: \"นักเรียนเคยเจอเรื่อง {t} ที่ไหนบ้าง?\" "
        f"เพื่อดึงความสนใจก่อนเข้าสู่เนื้อหา\n"
        f"สไลด์ 2 — อธิบายแนวคิดหลักของ {t} พร้อมยกตัวอย่างใกล้ตัวนักเรียน\n"
        f"สไลด์ 3 — ให้ทำกิจกรรมกลุ่ม 5 นาที แล้วเฉลยร่วมกันทั้งห้อง\n"
        f"สไลด์ 4 — สรุป 3 ประเด็นสำคัญ และมอบการบ้านท้ายชั่วโมง"
    )
    return {
        "topic": t,
        "slides": slides,
        "script": script,
        "suggestedImages": [
            f"ภาพประกอบหัวข้อ {t} สไตล์การ์ตูนการศึกษา สีสันสดใส",
            "ภาพนักเรียนกลุ่มเล็กกำลังเรียนรู้ร่วมกัน",
            "ภาพไอคอนอินโฟกราฟิกสำหรับสรุปบทเรียน",
        ],
        "generatedBy": "mock-media-generator-v1",
    }


# ---------------------------------------------------------------------------
# ประเมินการอ่าน (reading assessment)
# ---------------------------------------------------------------------------

def reading_assess() -> dict[str, Any]:
    """Mock reading-fluency assessment: 5 students, deterministic records
    (words-per-minute, accuracy, fluency level, error count)."""
    return {
        "records": [
            {"studentId": "s-001", "name": "เด็กชายสมชาย ใจดี", "date": "2026-08-10",
             "wpm": 92, "accuracyPct": 94, "fluency": "ปานกลาง", "errors": 6},
            {"studentId": "s-002", "name": "เด็กหญิงสมหญิง รักเรียน", "date": "2026-08-10",
             "wpm": 128, "accuracyPct": 98, "fluency": "คล่อง", "errors": 2},
            {"studentId": "s-003", "name": "เด็กชายอนุชา แซ่ลี้", "date": "2026-08-11",
             "wpm": 58, "accuracyPct": 86, "fluency": "ต้องฝึก", "errors": 14},
            {"studentId": "s-004", "name": "เด็กหญิงพิมพ์ชนก ศรีสุข", "date": "2026-08-11",
             "wpm": 135, "accuracyPct": 99, "fluency": "คล่อง", "errors": 1},
            {"studentId": "s-005", "name": "เด็กชายธนกร วงษ์คำ", "date": "2026-08-12",
             "wpm": 75, "accuracyPct": 91, "fluency": "ปานกลาง", "errors": 9},
        ],
        "generatedBy": "mock-reading-assessment-v1",
    }


# ---------------------------------------------------------------------------
# วิเคราะห์พฤติกรรม (behavior insights)
# ---------------------------------------------------------------------------

def behavior_insights() -> dict[str, Any]:
    """Mock behavior-analysis dashboard: per-student trend + class insights."""
    students = [
        {"id": "s-001", "name": "เด็กชายสมชาย ใจดี", "trend": "ดีขึ้น", "attendancePct": 96,
         "gradeTrend": "คะแนนสอบล่าสุดสูงขึ้น 1 ระดับ",
         "flags": ["ส่งงานตรงเวลาเพิ่มขึ้น"], "summary": "ตั้งใจเรียนมากขึ้นในวิชาคณิตศาสตร์"},
        {"id": "s-002", "name": "เด็กหญิงสมหญิง รักเรียน", "trend": "ทรงตัว", "attendancePct": 98,
         "gradeTrend": "ผลการเรียนคงที่ระดับดีมาก",
         "flags": [], "summary": "มีสมาธิดี มักช่วยเหลือเพื่อนในห้อง"},
        {"id": "s-003", "name": "เด็กชายอนุชา แซ่ลี้", "trend": "แย่ลง", "attendancePct": 82,
         "gradeTrend": "คะแนนลดลง 2 ระดับในช่วง 2 เดือน",
         "flags": ["ขาดเรียนบ่อย", "ไม่ส่งการบ้าน 3 ครั้ง"], "summary": "ควรพบครูที่ปรึกษาและติดต่อผู้ปกครอง"},
        {"id": "s-004", "name": "เด็กหญิงพิมพ์ชนก ศรีสุข", "trend": "ดีขึ้น", "attendancePct": 100,
         "gradeTrend": "คะแนนสูงขึ้นต่อเนื่อง 3 ครั้ง",
         "flags": ["เข้าร่วมกิจกรรมชมรม"], "summary": "พัฒนาการดีมาก สนับสนุนให้แข่งขันวิชาการ"},
        {"id": "s-005", "name": "เด็กชายธนกร วงษ์คำ", "trend": "ทรงตัว", "attendancePct": 93,
         "gradeTrend": "ผลการเรียนคงที่ระดับปานกลาง",
         "flags": ["คุยในชั่วโมงเรียนบ้าง"], "summary": "จัดที่นั่งใกล้ครูและมอบบทบาทผู้นำกลุ่ม"},
    ]
    return {
        "students": students,
        "insights": [
            "นักเรียน 2 ใน 5 คนมีแนวโน้มดีขึ้น — สานต่อกิจกรรมที่ได้ผล",
            "นักเรียน 1 คนมีแนวโน้มแย่ลง (ขาดเรียน + ไม่ส่งงาน) — ควรประชุมผู้ปกครองภายในสัปดาห์นี้",
            "อัตราการมาเรียนเฉลี่ย 93.8% — สูงกว่าเกณฑ์ขั้นต่ำของโรงเรียน (90%)",
        ],
        "generatedBy": "mock-behavior-insights-v1",
    }


# ---------------------------------------------------------------------------
# ผู้ช่วยผู้บริหาร (principal dashboard)
# ---------------------------------------------------------------------------

def principal_dashboard() -> dict[str, Any]:
    """Mock principal dashboard: KPI summary + typed insights + alerts."""
    return {
        "summary": {
            "enrollment": 452,
            "avgGpa": 3.24,
            "attendancePct": 93.8,
            "budgetUsedPct": 67,
            "staffCount": 38,
        },
        "insights": [
            {"type": "จุดแข็ง", "text": "อัตราการมาเรียนเฉลี่ย 93.8% สูงกว่าเป้าหมายของโรงเรียน"},
            {"type": "จุดแข็ง", "text": "ผลการเรียนเฉลี่ย GPA 3.24 เพิ่มขึ้นจากภาคเรียนก่อน 0.08"},
            {"type": "จุดเสี่ยง", "text": "นักเรียนชั้น ม.1 มีอัตราขาดเรียนสูงสุด (9.5%) — ควรติดตามรายบุคคล"},
            {"type": "จุดเสี่ยง", "text": "งบประมาณใช้ไปแล้ว 67% ในเดือนที่ 8 — เหลือ 33% สำหรับ 4 เดือนสุดท้าย"},
            {"type": "ข้อเสนอแนะ", "text": "จัดโครงการซ่อมเสริมคณิตศาสตร์สำหรับนักเรียนที่คะแนนต่ำกว่าเกณฑ์ 15 คน"},
            {"type": "ข้อเสนอแนะ", "text": "อบรมครูเรื่องการวิเคราะห์ข้อมูลผลการเรียนรายห้อง 2 ครั้งต่อภาคเรียน"},
        ],
        "alerts": [
            "นักเรียน 3 คนเสี่ยงไม่จบการศึกษาในปีนี้ (คะแนนต่ำ + ขาดเรียนซ้ำ)",
            "ห้องน้ำอาคาร 2 ขัดข้อง 2 วัน — แจ้งงานอาคารสถานที่แล้ว",
            "ยังไม่ส่งรายงานผลการเรียนภาคเรียนที่ 1 จำนวน 2 ห้อง",
        ],
        "generatedBy": "mock-principal-dashboard-v1",
    }


# ---------------------------------------------------------------------------
# AI ติวเตอร์ (tutor)
# ---------------------------------------------------------------------------

_TUTOR_RULES: dict[str, list[dict[str, str]]] = {
    "คณิตศาสตร์": [
        {"keywords": "เศษส่วน", "reply": "เศษส่วนคือการแบ่งสิ่งของออกเป็นส่วนเท่าๆ กัน เช่น 1/2 คือ 1 ส่วนจากทั้งหมด 2 ส่วนเท่าๆ กัน ลองนึกภาพพิซซ่า 1 ถาดแบ่งเป็น 8 ชิ้น เรากิน 3 ชิ้น ก็คือ 3/8 ของถาด", "topic": "เศษส่วนเบื้องต้น", "practice": "จงหาค่า 2/5 + 1/5 และเขียนคำตอบเป็นเศษส่วนอย่างต่ำ"},
        {"keywords": "บวก", "reply": "การบวกคือการรวมจำนวนเข้าด้วยกัน เช่น 25 + 17 = 42 ลองแยกเป็น 25 + 10 + 7 = 42 จะคิดง่ายขึ้น", "topic": "การบวกเลข", "practice": "จงหาค่า 47 + 36 (ลองแยกหลักสิบกับหลักหน่วยก่อนบวก)"},
        {"keywords": "พื้นที่", "reply": "พื้นที่สามเหลี่ยม = (ฐาน x สูง) / 2 เช่น ฐาน 8 ซม. สูง 5 ซม. จะได้ (8 x 5) / 2 = 20 ตร.ซม.", "topic": "การหาพื้นที่", "practice": "สามเหลี่ยมฐาน 10 ซม. สูง 6 ซม. มีพื้นที่เท่าไร"},
    ],
    "วิทยาศาสตร์": [
        {"keywords": "น้ำ", "reply": "น้ำในธรรมชาติหมุนเวียนเป็นวัฏจักร: ระเหยเป็นไอ -> ควบแน่นเป็นเมฆ -> ตกเป็นฝน -> ไหลลงสู่แหล่งน้ำ แล้วระเหยซ้ำอีกครั้ง", "topic": "วัฏจักรน้ำ", "practice": "จงเรียงลำดับวัฏจักรน้ำ 4 ขั้นตอนพร้อมยกตัวอย่าง"},
        {"keywords": "พืช", "reply": "พืชหายใจด้วยปากใบ (stomata) ที่อยู่ใต้ใบ แลกเปลี่ยนแก๊สออกซิเจนและคาร์บอนไดออกไซด์ ส่วนรากดูดน้ำและแร่ธาตุขึ้นไปเลี้ยงลำต้นและใบ", "topic": "โครงสร้างพืช", "practice": "อวัยวะใดของพืชทำหน้าที่ดูดน้ำและแร่ธาตุ"},
        {"keywords": "แรง", "reply": "แรงคือการผลักหรือดึงที่ทำให้วัตถุเคลื่อนที่ เปลี่ยนทิศทาง หรือเปลี่ยนรูปร่าง หน่วยวัดคือ นิวตัน (N)", "topic": "แรงและการเคลื่อนที่", "practice": "ยกตัวอย่างแรงผลักและแรงดึงอย่างละ 1 อย่างในชีวิตประจำวัน"},
    ],
    "ภาษาไทย": [
        {"keywords": "อ่าน", "reply": "การอ่านจับใจความสำคัญ เริ่มจากอ่านรอบแรกให้เข้าใจโดยรวม แล้วหาประโยคหลักของแต่ละย่อหน้า ใช้ดินสอขีดใต้คำสำคัญ แล้วสรุปด้วยภาษาของตนเอง", "topic": "การอ่านจับใจความ", "practice": "อ่านเรื่องสั้น 1 เรื่อง แล้วเขียนใจความสำคัญ 1-2 ประโยค"},
        {"keywords": "คำ", "reply": "คำที่มีความหมายตรงข้าม (คำตรงข้าม) เช่น สว่าง-มืด ใหญ่-เล็ก เร็ว-ช้า ใช้ช่วยให้ภาษาเปรียบเทียบได้ชัดเจนขึ้น", "topic": "คำตรงข้าม", "practice": "หาคำตรงข้ามของ: ร้อน, สูง, ดี, ใหม่"},
    ],
    "สังคมศึกษา": [
        {"keywords": "แม่น้ำ", "reply": "แม่น้ำเจ้าพระยาเป็นแม่น้ำสายสำคัญของไทย ไหลจากภาคเหนือลงสู่อ่าวไทย ผ่านกรุงเทพฯ เป็นเส้นทางคมนาคมและแหล่งน้ำเพื่อการเกษตร", "topic": "ภูมิศาสตร์ไทย", "practice": "แม่น้ำเจ้าพระยาไหลลงสู่ทะเลใด"},
        {"keywords": "ประชาธิปไตย", "reply": "ประชาธิปไตยคือการปกครองโดยประชาชน ผ่านการเลือกตั้งผู้แทน เพื่อร่วมตัดสินใจเรื่องส่วนรวม และเคารพสิทธิเสียงข้างมากพร้อมดูแลเสียงข้างน้อย", "topic": "การปกครอง", "practice": "การเลือกตั้งมีความสำคัญต่อสังคมประชาธิปไตยอย่างไร"},
    ],
}

_DEFAULT_TUTOR_RULES: dict[str, str] = {
    "reply": "ขอบคุณสำหรับคำถาม! ในโหมดสาธิต ฉันตอบจากคลังคำตอบสำเร็จรูป ลองถามหัวข้อที่ระบุไว้ในชิปวิชาเพื่อดูตัวอย่างคำตอบ",
    "topic": "หัวข้อทั่วไป",
    "practice": "ทบทวนเนื้อหาในบทเรียนล่าสุด แล้วลองทำแบบฝึกหัดท้ายบทด้วยตัวเอง",
}


def tutor_reply(question: str, subject: str) -> dict[str, Any]:
    """Mock AI tutor: keyword-matched canned replies (deterministic),
    falls back to a generic subject-aware reply for unknown questions."""
    q = (question or "").strip()
    subj = (subject or "คณิตศาสตร์").strip()
    rules = _TUTOR_RULES.get(subj, _TUTOR_RULES["คณิตศาสตร์"])
    hit = next((r for r in rules if any(k in q for k in r["keywords"].split())), None)
    if hit is None:
        hit = _DEFAULT_TUTOR_RULES
    return {
        "question": q,
        "subject": subj,
        "reply": hit["reply"],
        "relatedTopic": hit["topic"],
        "practiceQuestion": hit["practice"],
        "generatedBy": "mock-tutor-v1",
    }
