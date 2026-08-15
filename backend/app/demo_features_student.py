"""Deterministic demo generators for student-affairs features — dev/demo only.

Sibling of demo_features.py: one generator per student-support feature
(พอร์ทัลผู้ปกครอง, ทะเบียนนักเรียน, ทุนการศึกษา, สุขภาพนักเรียน, ระบบแนะแนว,
แผน IEP). Every generator returns the SAME output for the same input
(no randomness) so the demo is reproducible. All data is clearly synthetic
(PDPA): no real student data anywhere. Student ids reuse the roster
identities s-001..s-015 from demo_features.roster_default() for consistency.
Routes are registered later — this module only generates data.

Stdlib only on purpose.
"""

from __future__ import annotations

from typing import Any


def parent_portal() -> dict[str, Any]:
    """Parent portal (พอร์ทัลผู้ปกครอง): 3 children, one per class, with
    grades, attendance, homework and teacher notes. Deterministic."""
    return {
        "students": [
            {
                "id": "s-002",
                "name": "เด็กหญิงสมหญิง รักเรียน",
                "className": "ป.4/1",
                "grades": [
                    {"subject": "คณิตศาสตร์", "score": 92, "grade": "4"},
                    {"subject": "ภาษาไทย", "score": 88, "grade": "4"},
                    {"subject": "วิทยาศาสตร์", "score": 85, "grade": "3.5"},
                    {"subject": "สังคมศึกษา", "score": 90, "grade": "4"},
                    {"subject": "ภาษาอังกฤษ", "score": 86, "grade": "3.5"},
                ],
                "attendance": {"present": 98, "absent": 1, "late": 2},
                "homework": [
                    {"title": "แบบฝึกหัดเศษส่วน บทที่ 3", "status": "ส่งแล้ว"},
                    {"title": "อ่านหนังสือภาษาไทยวันละ 10 นาที", "status": "ยังไม่ส่ง"},
                    {"title": "การ์ตูนวิทยาศาสตร์ เรื่องวัฏจักรน้ำ", "status": "ส่งแล้ว"},
                ],
                "teacherNotes": [
                    "สมหญิงตั้งใจเรียนดี ช่วยเหลือเพื่อนในชั้นเรียน",
                    "ควรฝึกอ่านออกเสียงภาษาไทยเพิ่มเติมที่บ้าน",
                ],
            },
            {
                "id": "s-008",
                "name": "เด็กหญิงสุชาดา พรมมา",
                "className": "ป.5/1",
                "grades": [
                    {"subject": "คณิตศาสตร์", "score": 74, "grade": "3"},
                    {"subject": "ภาษาไทย", "score": 68, "grade": "2.5"},
                    {"subject": "วิทยาศาสตร์", "score": 71, "grade": "3"},
                    {"subject": "สังคมศึกษา", "score": 80, "grade": "3.5"},
                    {"subject": "ภาษาอังกฤษ", "score": 65, "grade": "2.5"},
                ],
                "attendance": {"present": 93, "absent": 4, "late": 3},
                "homework": [
                    {"title": "แบบฝึกหัดโจทย์ปัญหา บทที่ 5", "status": "ส่งแล้ว"},
                    {"title": "สรุปความรู้เรื่องภูมิอากาศ", "status": "ยังไม่ส่ง"},
                ],
                "teacherNotes": [
                    "สุชาดาพัฒนาขึ้นมากในช่วงเดือนที่ผ่านมา",
                    "แม่ควรช่วยทบทวนภาษาอังกฤษหลังเลิกเรียน",
                ],
            },
            {
                "id": "s-012",
                "name": "เด็กหญิงอรอุมา ใจบุญ",
                "className": "ม.1/1",
                "grades": [
                    {"subject": "คณิตศาสตร์", "score": 95, "grade": "4"},
                    {"subject": "ภาษาไทย", "score": 91, "grade": "4"},
                    {"subject": "วิทยาศาสตร์", "score": 89, "grade": "3.5"},
                    {"subject": "สังคมศึกษา", "score": 93, "grade": "4"},
                    {"subject": "ภาษาอังกฤษ", "score": 97, "grade": "4"},
                ],
                "attendance": {"present": 100, "absent": 0, "late": 0},
                "homework": [
                    {"title": "เรียงความเรื่องครอบครัวของฉัน", "status": "ส่งแล้ว"},
                    {"title": "การทดลองเรื่องความเป็นกรด-เบส", "status": "ส่งแล้ว"},
                ],
                "teacherNotes": [
                    "อรอุมาเป็นหัวหน้าชั้นที่รับผิดชอบมาก",
                    "สนใจแข่งขันตอบปัญหาวิทยาศาสตร์ระดับจังหวัด",
                ],
            },
        ]
    }


def student_registry() -> list[dict[str, Any]]:
    """Full student registry (ทะเบียนนักเรียน): the 15 roster students plus
    3 extra who transferred out / graduated. Deterministic."""
    rows: list[dict[str, Any]] = [
        {"id": "s-001", "name": "เด็กชายสมชาย ใจดี", "birthDate": "15 พ.ค. 2561", "className": "ป.4/1",
         "parentName": "นายประสิทธิ์ ใจดี", "parentPhone": "081-234-0001",
         "address": "12/3 หมู่ 5 ต.บางพลีใหญ่ อ.บางพลี จ.สมุทรปราการ 10540", "status": "กำลังศึกษา"},
        {"id": "s-002", "name": "เด็กหญิงสมหญิง รักเรียน", "birthDate": "2 ก.พ. 2561", "className": "ป.4/1",
         "parentName": "นางสาวลำไย รักเรียน", "parentPhone": "081-234-0002",
         "address": "88 หมู่ 2 ต.ราชาเทวะ อ.บางพลี จ.สมุทรปราการ 10540", "status": "กำลังศึกษา"},
        {"id": "s-003", "name": "เด็กชายอนุชา แซ่ลี้", "birthDate": "20 ก.ค. 2561", "className": "ป.4/1",
         "parentName": "นายวิเชียร แซ่ลี้", "parentPhone": "081-234-0003",
         "address": "345 ถ.สุขุมวิท ต.สำโรงเหนือ อ.เมือง จ.สมุทรปราการ 10270", "status": "กำลังศึกษา"},
        {"id": "s-004", "name": "เด็กหญิงพิมพ์ชนก ศรีสุข", "birthDate": "9 พ.ย. 2560", "className": "ป.4/1",
         "parentName": "นางประภา ศรีสุข", "parentPhone": "081-234-0004",
         "address": "56/1 หมู่ 8 ต.บางแก้ว อ.บางพลี จ.สมุทรปราการ 10540", "status": "กำลังศึกษา"},
        {"id": "s-005", "name": "เด็กชายธนกร วงษ์คำ", "birthDate": "30 มี.ค. 2561", "className": "ป.4/1",
         "parentName": "นายสุรชัย วงษ์คำ", "parentPhone": "081-234-0005",
         "address": "222 หมู่ 3 ต.หนองปรือ อ.บางพลี จ.สมุทรปราการ 10540", "status": "กำลังศึกษา"},
        {"id": "s-006", "name": "เด็กหญิงกนกพร ทองดี", "birthDate": "18 มิ.ย. 2560", "className": "ป.5/1",
         "parentName": "นายทองดี ศรีจันทร์", "parentPhone": "081-234-0006",
         "address": "77 หมู่ 9 ต.บางพลีน้อย อ.บางบ่อ จ.สมุทรปราการ 10560", "status": "กำลังศึกษา"},
        {"id": "s-007", "name": "เด็กชายวรเมธ กล้าหาญ", "birthDate": "5 ม.ค. 2560", "className": "ป.5/1",
         "parentName": "นางสาวรัชนี กล้าหาญ", "parentPhone": "081-234-0007",
         "address": "410 ถ.เทพารักษ์ ต.เทพารักษ์ อ.เมือง จ.สมุทรปราการ 10270", "status": "กำลังศึกษา"},
        {"id": "s-008", "name": "เด็กหญิงสุชาดา พรมมา", "birthDate": "27 ส.ค. 2560", "className": "ป.5/1",
         "parentName": "นายสมพงษ์ พรมมา", "parentPhone": "081-234-0008",
         "address": "19 หมู่ 6 ต.บางเมือง อ.เมือง จ.สมุทรปราการ 10270", "status": "กำลังศึกษา"},
        {"id": "s-009", "name": "เด็กชายณัฐพล ขันทอง", "birthDate": "14 เม.ย. 2560", "className": "ป.5/1",
         "parentName": "นางทองใบ ขันทอง", "parentPhone": "081-234-0009",
         "address": "333 หมู่ 10 ต.คลองด่าน อ.บางบ่อ จ.สมุทรปราการ 10550", "status": "กำลังศึกษา"},
        {"id": "s-010", "name": "เด็กหญิงมณีรัตน์ สุขสันต์", "birthDate": "8 ธ.ค. 2560", "className": "ป.5/1",
         "parentName": "นายไพศาล สุขสันต์", "parentPhone": "081-234-0010",
         "address": "64/2 หมู่ 1 ต.บางบ่อ อ.บางบ่อ จ.สมุทรปราการ 10560", "status": "กำลังศึกษา"},
        {"id": "s-011", "name": "เด็กชายกิตติพงษ์ แก้วใส", "birthDate": "21 ก.พ. 2555", "className": "ม.1/1",
         "parentName": "นางสมพิศ แก้วใส", "parentPhone": "081-234-0011",
         "address": "150 หมู่ 7 ต.บางพลีใหญ่ อ.บางพลี จ.สมุทรปราการ 10540", "status": "กำลังศึกษา"},
        {"id": "s-012", "name": "เด็กหญิงอรอุมา ใจบุญ", "birthDate": "3 ก.ย. 2555", "className": "ม.1/1",
         "parentName": "นายอำนาจ ใจบุญ", "parentPhone": "081-234-0012",
         "address": "9/1 หมู่ 4 ต.ราชาเทวะ อ.บางพลี จ.สมุทรปราการ 10540", "status": "กำลังศึกษา"},
        {"id": "s-013", "name": "เด็กชายพีรพัฒน์ ทรัพย์เจริญ", "birthDate": "17 พ.ค. 2555", "className": "ม.1/1",
         "parentName": "นางสาวกานดา ทรัพย์เจริญ", "parentPhone": "081-234-0013",
         "address": "201 ถ.ศรีนครินทร์ ต.สำโรงเหนือ อ.เมือง จ.สมุทรปราการ 10270", "status": "กำลังศึกษา"},
        {"id": "s-014", "name": "เด็กหญิงจิดาภา วัฒนา", "birthDate": "29 ต.ค. 2555", "className": "ม.1/1",
         "parentName": "นายกิตติ วัฒนา", "parentPhone": "081-234-0014",
         "address": "48 หมู่ 11 ต.บางแก้ว อ.บางพลี จ.สมุทรปราการ 10540", "status": "กำลังศึกษา"},
        {"id": "s-015", "name": "เด็กชายศุภกร หมื่นแก้ว", "birthDate": "11 มิ.ย. 2555", "className": "ม.1/1",
         "parentName": "นางบุญเรือน หมื่นแก้ว", "parentPhone": "081-234-0015",
         "address": "275 หมู่ 2 ต.บางเสาธง อ.บางเสาธง จ.สมุทรปราการ 10570", "status": "กำลังศึกษา"},
        {"id": "s-016", "name": "เด็กหญิงปาริชาติ แก้วกุล", "birthDate": "6 ส.ค. 2560", "className": "ป.4/1",
         "parentName": "นายชูชาติ แก้วกุล", "parentPhone": "081-234-0016",
         "address": "102 หมู่ 5 ต.บางพลีใหญ่ อ.บางพลี จ.สมุทรปราการ 10540",
         "status": "ย้ายออก", "note": "ย้ายไปโรงเรียนบ้านคลองบางแก้ว เมื่อ 15 ก.ค. 2569"},
        {"id": "s-017", "name": "เด็กชายธีรภัทร อยู่เย็น", "birthDate": "23 มี.ค. 2553", "className": "ป.6/1",
         "parentName": "นางสำเนียง อยู่เย็น", "parentPhone": "081-234-0017",
         "address": "58/3 หมู่ 8 ต.บางแก้ว อ.บางพลี จ.สมุทรปราการ 10540",
         "status": "จบการศึกษา", "note": "จบชั้น ป.6 ปีการศึกษา 2565"},
        {"id": "s-018", "name": "เด็กชายชลสิทธิ์ ปานทอง", "birthDate": "12 ม.ค. 2560", "className": "ป.5/1",
         "parentName": "นายประหยัด ปานทอง", "parentPhone": "081-234-0018",
         "address": "7 หมู่ 6 ต.บางเมือง อ.เมือง จ.สมุทรปราการ 10270",
         "status": "ย้ายออก", "note": "ย้ายไปศึกษาต่อต่างจังหวัด เมื่อ 10 พ.ค. 2569"},
    ]
    return rows


def scholarship_programs() -> dict[str, Any]:
    """Scholarship programs (ทุนการศึกษา) + deterministic eligibility list."""
    programs = [
        {"id": "p-001", "name": "ทุนเรียนดี", "sponsor": "มูลนิธิเพื่อการศึกษาไทย",
         "amount": 3000, "criteria": "ผลการเรียนเฉลี่ย 3.50 ขึ้นไป และความประพฤติดี",
         "deadline": "30 ก.ย. 2569"},
        {"id": "p-002", "name": "ทุนนักเรียนยากจนพิเศษ", "sponsor": "องค์การบริหารส่วนจังหวัดสมุทรปราการ",
         "amount": 5000, "criteria": "รายได้ครัวเรือนไม่เกิน 3,000 บาท/เดือน",
         "deadline": "15 ต.ค. 2569"},
        {"id": "p-003", "name": "ทุนกีฬาดีเด่น", "sponsor": "ชมรมผู้ปกครองและครูโรงเรียนสาธิต",
         "amount": 2000, "criteria": "เป็นนักกีฬาตัวแทนโรงเรียน และมีผลการเรียนเฉลี่ย 2.50 ขึ้นไป",
         "deadline": "31 ต.ค. 2569"},
    ]
    eligible = [
        {"programId": "p-001", "studentId": "s-002", "status": "อนุมัติ"},
        {"programId": "p-001", "studentId": "s-012", "status": "รอตรวจ"},
        {"programId": "p-001", "studentId": "s-014", "status": "รอตรวจ"},
        {"programId": "p-001", "studentId": "s-010", "status": "ปฏิเสธ"},
        {"programId": "p-002", "studentId": "s-003", "status": "รอตรวจ"},
        {"programId": "p-002", "studentId": "s-008", "status": "อนุมัติ"},
        {"programId": "p-002", "studentId": "s-013", "status": "รอตรวจ"},
        {"programId": "p-002", "studentId": "s-009", "status": "รอตรวจ"},
        {"programId": "p-003", "studentId": "s-005", "status": "อนุมัติ"},
        {"programId": "p-003", "studentId": "s-011", "status": "รอตรวจ"},
        {"programId": "p-003", "studentId": "s-007", "status": "ปฏิเสธ"},
    ]
    return {"programs": programs, "eligibleStudents": eligible}


def health_records() -> list[dict[str, Any]]:
    """Student health records (สุขภาพนักเรียน): 2 terms per student for
    6 roster students. BMI is computed deterministically from height/weight."""
    raw = [
        # (studentId, term, heightCm, weightKg, vision, note)
        ("s-001", "ภาคเรียนที่ 2/2568", 128.0, 27.0, "ปกติ", "สุขภาพแข็งแรง"),
        ("s-001", "ภาคเรียนที่ 1/2569", 130.0, 28.5, "ปกติ", "สุขภาพแข็งแรง"),
        ("s-002", "ภาคเรียนที่ 2/2568", 126.5, 25.0, "ปกติ", "สุขภาพแข็งแรง"),
        ("s-002", "ภาคเรียนที่ 1/2569", 128.5, 26.0, "ปกติ", "สุขภาพแข็งแรง"),
        ("s-003", "ภาคเรียนที่ 2/2568", 125.0, 23.0, "สายตาสั้นเล็กน้อย", "แนะนำตรวจวัดสายตาปีละครั้ง"),
        ("s-003", "ภาคเรียนที่ 1/2569", 127.0, 24.0, "สายตาสั้นเล็กน้อย", "กำลังใส่แว่นตา"),
        ("s-006", "ภาคเรียนที่ 2/2568", 138.0, 40.0, "ปกติ", "น้ำหนักมากกว่าเกณฑ์เล็กน้อย"),
        ("s-006", "ภาคเรียนที่ 1/2569", 139.5, 42.5, "ปกติ", "แนะนำออกกำลังกายสม่ำเสมอ"),
        ("s-008", "ภาคเรียนที่ 2/2568", 136.0, 31.0, "ปกติ", "สุขภาพแข็งแรง"),
        ("s-008", "ภาคเรียนที่ 1/2569", 138.0, 32.5, "ปกติ", "สุขภาพแข็งแรง"),
        ("s-012", "ภาคเรียนที่ 2/2568", 152.0, 44.0, "ปกติ", "สุขภาพแข็งแรง"),
        ("s-012", "ภาคเรียนที่ 1/2569", 154.5, 46.0, "ปกติ", "สุขภาพแข็งแรง"),
        ("s-015", "ภาคเรียนที่ 2/2568", 150.0, 38.0, "ปกติ", "สุขภาพแข็งแรง"),
        ("s-015", "ภาคเรียนที่ 1/2569", 152.0, 39.5, "ปกติ", "สุขภาพแข็งแรง"),
    ]
    records: list[dict[str, Any]] = []
    for student_id, term, height, weight, vision, note in raw:
        bmi = round(weight / ((height / 100.0) ** 2), 1)
        records.append({
            "studentId": student_id,
            "term": term,
            "heightCm": height,
            "weightKg": weight,
            "bmi": bmi,
            "vision": vision,
            "note": note,
        })
    return records


def guidance_log() -> dict[str, Any]:
    """Guidance system (ระบบแนะแนว): counseling sessions + appointments."""
    sessions = [
        {"id": "g-001", "date": "5 ส.ค. 2569", "studentId": "s-003",
         "topic": "ปรับตัวกับเพื่อนในชั้นเรียน",
         "summary": "นักเรียนรู้สึกถูกแกล้งในห้องเรียน ครูแนะแนวให้เทคนิคการพูดกล้าแสดงออก",
         "counselor": "ครูมยุรี ฉลาดคิด", "followUp": "ติดตามผลภายใน 2 สัปดาห์"},
        {"id": "g-002", "date": "12 ส.ค. 2569", "studentId": "s-008",
         "topic": "การวางแผนการเรียนภาษาอังกฤษ",
         "summary": "นักเรียนอยากพัฒนาทักษะภาษาอังกฤษ วางแผนเรียนพิเศษกับครูประจำวิชา",
         "counselor": "ครูมยุรี ฉลาดคิด", "followUp": "ตรวจสอบความก้าวหน้าปลายเดือน"},
        {"id": "g-003", "date": "19 ส.ค. 2569", "studentId": "s-013",
         "topic": "ความเครียดจากการสอบ",
         "summary": "นักเรียนกังวลเรื่องผลสอบกลางภาค ฝึกเทคนิคการผ่อนคลายและจัดตารางอ่านหนังสือ",
         "counselor": "ครูสมพร ปลอดภัย", "followUp": "นัดพบซ้ำหลังสอบกลางภาค"},
        {"id": "g-004", "date": "26 ส.ค. 2569", "studentId": "s-015",
         "topic": "วางแผนศึกษาต่อ",
         "summary": "นักเรียนสนใจสายอาชีพด้านช่างยนต์ ให้ข้อมูลโรงเรียนอาชีวะในจังหวัด",
         "counselor": "ครูสมพร ปลอดภัย", "followUp": "พานักเรียนไปงานเปิดบ้านอาชีวะ ก.ย. 2569"},
        {"id": "g-005", "date": "2 ก.ย. 2569", "studentId": "s-012",
         "topic": "การสมัครแข่งขันวิชาการ",
         "summary": "นักเรียนต้องการสมัครแข่งขันตอบปัญหาวิทยาศาสตร์ระดับจังหวัด ประสานครูพี่เลี้ยงให้",
         "counselor": "ครูมยุรี ฉลาดคิด", "followUp": "ยื่นใบสมัครภายใน 15 ก.ย. 2569"},
    ]
    appointments = [
        {"id": "a-001", "date": "9 ก.ย. 2569", "studentId": "s-004",
         "reason": "ปัญหาการบ้านไม่ส่งบ่อยครั้ง", "status": "รอพบ"},
        {"id": "a-002", "date": "10 ก.ย. 2569", "studentId": "s-009",
         "reason": "พฤติกรรมไม่ตั้งใจเรียนในคาบบ่าย", "status": "รอพบ"},
        {"id": "a-003", "date": "6 ส.ค. 2569", "studentId": "s-003",
         "reason": "ติดตามผลการปรับตัวกับเพื่อน", "status": "พบแล้ว"},
        {"id": "a-004", "date": "16 ก.ย. 2569", "studentId": "s-007",
         "reason": "ผู้ปกครองขอคำปรึกษาเรื่องการเรียน", "status": "เลื่อนนัด"},
    ]
    return {"sessions": sessions, "appointments": appointments}


def iep_plans() -> list[dict[str, Any]]:
    """Individual Education Plans (แผน IEP): deterministic plans for
    3 students with risk factors, goals, support measures and review dates."""
    return [
        {"id": "iep-001", "studentId": "s-003",
         "riskFactors": ["สมาธิสั้น", "อ่านไม่ออกคล่อง"],
         "goals": [
             "อ่านหนังสือได้ 40 คำต่อนาที ภายใน 3 เดือน",
             "ทำการบ้านส่งครบ 8 ใน 10 สัปดาห์",
             "ควบคุมอารมณ์เมื่อถูกเพื่อนยั่ว ใช้คำพูดแทนการตอบโต้",
         ],
         "supportMeasures": [
             "จัดที่นั่งหน้าห้องใกล้ครูประจำชั้น",
             "แบบฝึกอ่านเพิ่มเติมสัปดาห์ละ 3 วัน กับครูภาษาไทย",
             "พี่เลี้ยงช่วยเหลือการบ้านหลังเลิกเรียน",
             "ประชุมผู้ปกครองทุกเดือน",
         ],
         "reviewDate": "15 ก.พ. 2570", "status": "ดำเนินการ"},
        {"id": "iep-002", "studentId": "s-009",
         "riskFactors": ["เรียนช้าด้านคณิตศาสตร์", "ขาดเรียนบ่อย"],
         "goals": [
             "ทำโจทย์การบวก-ลบเศษส่วนได้ถูกต้อง 80%",
             "เข้าเรียนครบ 95% ของวันเรียน",
         ],
         "supportMeasures": [
             "สอนเสริมคณิตศาสตร์สัปดาห์ละ 2 คาบ",
             "ติดตามการมาเรียนกับผู้ปกครองทุกสัปดาห์",
             "ใช้สื่อการเรียนรู้ที่หลากหลายในการสอน",
         ],
         "reviewDate": "20 มี.ค. 2570", "status": "ดำเนินการ"},
        {"id": "iep-003", "studentId": "s-015",
         "riskFactors": ["ซึมเศร้าเล็กน้อย", "ความภาคภูมิใจในตนเองต่ำ"],
         "goals": [
             "เข้าร่วมกิจกรรมชมรมอย่างน้อยสัปดาห์ละ 1 ครั้ง",
             "เล่าเรื่องความสำเร็จเล็กๆ ของตัวเองได้สัปดาห์ละ 1 เรื่อง",
         ],
         "supportMeasures": [
             "เข้ารับคำปรึกษากับครูแนะแนวทุกสัปดาห์",
             "ครูประจำชั้นให้กำลังใจและชื่นชมความสำเร็จ",
             "ชวนเข้าร่วมชมรมดนตรีที่นักเรียนสนใจ",
         ],
         "reviewDate": "10 ม.ค. 2570", "status": "รอประเมิน"},
    ]
