// Mock student-affairs data (features: พอร์ทัลผู้ปกครอง, ทะเบียนนักเรียน,
// ทุนการศึกษา, สุขภาพนักเรียน, ระบบแนะแนว, แผน IEP) — deterministic demo data.
// Tries the backend /api/demo/* endpoints first; falls back to the local
// mirrors when the backend is unreachable (demo mode only).
// Student ids reuse the roster identities s-001..s-015 (see lib/roster.ts).

export interface ParentPortalStudent {
  id: string;
  name: string;
  className: string;
  grades: { subject: string; score: number; grade: string }[];
  attendance: { present: number; absent: number; late: number };
  homework: { title: string; status: string }[];
  teacherNotes: string[];
}

export interface ParentPortalData {
  students: ParentPortalStudent[];
}

export interface RegistryStudent {
  id: string;
  name: string;
  birthDate: string;
  className: string;
  parentName: string;
  parentPhone: string;
  address: string;
  status: string;
  note?: string;
}

export interface ScholarshipProgram {
  id: string;
  name: string;
  sponsor: string;
  amount: number;
  criteria: string;
  deadline: string;
}

export interface ScholarshipEligible {
  programId: string;
  studentId: string;
  status: string;
}

export interface ScholarshipData {
  programs: ScholarshipProgram[];
  eligibleStudents: ScholarshipEligible[];
}

export interface HealthRecord {
  studentId: string;
  term: string;
  heightCm: number;
  weightKg: number;
  bmi: number;
  vision: string;
  note: string;
}

export interface GuidanceSession {
  id: string;
  date: string;
  studentId: string;
  topic: string;
  summary: string;
  counselor: string;
  followUp: string;
}

export interface GuidanceAppointment {
  id: string;
  date: string;
  studentId: string;
  reason: string;
  status: string;
}

export interface GuidanceData {
  sessions: GuidanceSession[];
  appointments: GuidanceAppointment[];
}

export interface IepPlan {
  id: string;
  studentId: string;
  riskFactors: string[];
  goals: string[];
  supportMeasures: string[];
  reviewDate: string;
  status: string;
}

const API_URL =
  process.env.SOLVEN_BACKEND_URL ??
  process.env.NEXT_PUBLIC_SOLVEN_API_URL ??
  "http://localhost:8000";

const DEMO_MODE = process.env.NEXT_PUBLIC_SOLVEN_MODE === "demo";

export const LOCAL_PARENT_PORTAL: ParentPortalData = {
  students: [
    {
      id: "s-002",
      name: "เด็กหญิงสมหญิง รักเรียน",
      className: "ป.4/1",
      grades: [
        { subject: "คณิตศาสตร์", score: 92, grade: "4" },
        { subject: "ภาษาไทย", score: 88, grade: "4" },
        { subject: "วิทยาศาสตร์", score: 85, grade: "3.5" },
        { subject: "สังคมศึกษา", score: 90, grade: "4" },
        { subject: "ภาษาอังกฤษ", score: 86, grade: "3.5" },
      ],
      attendance: { present: 98, absent: 1, late: 2 },
      homework: [
        { title: "แบบฝึกหัดเศษส่วน บทที่ 3", status: "ส่งแล้ว" },
        { title: "อ่านหนังสือภาษาไทยวันละ 10 นาที", status: "ยังไม่ส่ง" },
        { title: "การ์ตูนวิทยาศาสตร์ เรื่องวัฏจักรน้ำ", status: "ส่งแล้ว" },
      ],
      teacherNotes: [
        "สมหญิงตั้งใจเรียนดี ช่วยเหลือเพื่อนในชั้นเรียน",
        "ควรฝึกอ่านออกเสียงภาษาไทยเพิ่มเติมที่บ้าน",
      ],
    },
    {
      id: "s-008",
      name: "เด็กหญิงสุชาดา พรมมา",
      className: "ป.5/1",
      grades: [
        { subject: "คณิตศาสตร์", score: 74, grade: "3" },
        { subject: "ภาษาไทย", score: 68, grade: "2.5" },
        { subject: "วิทยาศาสตร์", score: 71, grade: "3" },
        { subject: "สังคมศึกษา", score: 80, grade: "3.5" },
        { subject: "ภาษาอังกฤษ", score: 65, grade: "2.5" },
      ],
      attendance: { present: 93, absent: 4, late: 3 },
      homework: [
        { title: "แบบฝึกหัดโจทย์ปัญหา บทที่ 5", status: "ส่งแล้ว" },
        { title: "สรุปความรู้เรื่องภูมิอากาศ", status: "ยังไม่ส่ง" },
      ],
      teacherNotes: [
        "สุชาดาพัฒนาขึ้นมากในช่วงเดือนที่ผ่านมา",
        "แม่ควรช่วยทบทวนภาษาอังกฤษหลังเลิกเรียน",
      ],
    },
    {
      id: "s-012",
      name: "เด็กหญิงอรอุมา ใจบุญ",
      className: "ม.1/1",
      grades: [
        { subject: "คณิตศาสตร์", score: 95, grade: "4" },
        { subject: "ภาษาไทย", score: 91, grade: "4" },
        { subject: "วิทยาศาสตร์", score: 89, grade: "3.5" },
        { subject: "สังคมศึกษา", score: 93, grade: "4" },
        { subject: "ภาษาอังกฤษ", score: 97, grade: "4" },
      ],
      attendance: { present: 100, absent: 0, late: 0 },
      homework: [
        { title: "เรียงความเรื่องครอบครัวของฉัน", status: "ส่งแล้ว" },
        { title: "การทดลองเรื่องความเป็นกรด-เบส", status: "ส่งแล้ว" },
      ],
      teacherNotes: [
        "อรอุมาเป็นหัวหน้าชั้นที่รับผิดชอบมาก",
        "สนใจแข่งขันตอบปัญหาวิทยาศาสตร์ระดับจังหวัด",
      ],
    },
  ],
};

export const LOCAL_REGISTRY: RegistryStudent[] = [
  { id: "s-001", name: "เด็กชายสมชาย ใจดี", birthDate: "15 พ.ค. 2561", className: "ป.4/1", parentName: "นายประสิทธิ์ ใจดี", parentPhone: "081-234-0001", address: "12/3 หมู่ 5 ต.บางพลีใหญ่ อ.บางพลี จ.สมุทรปราการ 10540", status: "กำลังศึกษา" },
  { id: "s-002", name: "เด็กหญิงสมหญิง รักเรียน", birthDate: "2 ก.พ. 2561", className: "ป.4/1", parentName: "นางสาวลำไย รักเรียน", parentPhone: "081-234-0002", address: "88 หมู่ 2 ต.ราชาเทวะ อ.บางพลี จ.สมุทรปราการ 10540", status: "กำลังศึกษา" },
  { id: "s-003", name: "เด็กชายอนุชา แซ่ลี้", birthDate: "20 ก.ค. 2561", className: "ป.4/1", parentName: "นายวิเชียร แซ่ลี้", parentPhone: "081-234-0003", address: "345 ถ.สุขุมวิท ต.สำโรงเหนือ อ.เมือง จ.สมุทรปราการ 10270", status: "กำลังศึกษา" },
  { id: "s-004", name: "เด็กหญิงพิมพ์ชนก ศรีสุข", birthDate: "9 พ.ย. 2560", className: "ป.4/1", parentName: "นางประภา ศรีสุข", parentPhone: "081-234-0004", address: "56/1 หมู่ 8 ต.บางแก้ว อ.บางพลี จ.สมุทรปราการ 10540", status: "กำลังศึกษา" },
  { id: "s-005", name: "เด็กชายธนกร วงษ์คำ", birthDate: "30 มี.ค. 2561", className: "ป.4/1", parentName: "นายสุรชัย วงษ์คำ", parentPhone: "081-234-0005", address: "222 หมู่ 3 ต.หนองปรือ อ.บางพลี จ.สมุทรปราการ 10540", status: "กำลังศึกษา" },
  { id: "s-006", name: "เด็กหญิงกนกพร ทองดี", birthDate: "18 มิ.ย. 2560", className: "ป.5/1", parentName: "นายทองดี ศรีจันทร์", parentPhone: "081-234-0006", address: "77 หมู่ 9 ต.บางพลีน้อย อ.บางบ่อ จ.สมุทรปราการ 10560", status: "กำลังศึกษา" },
  { id: "s-007", name: "เด็กชายวรเมธ กล้าหาญ", birthDate: "5 ม.ค. 2560", className: "ป.5/1", parentName: "นางสาวรัชนี กล้าหาญ", parentPhone: "081-234-0007", address: "410 ถ.เทพารักษ์ ต.เทพารักษ์ อ.เมือง จ.สมุทรปราการ 10270", status: "กำลังศึกษา" },
  { id: "s-008", name: "เด็กหญิงสุชาดา พรมมา", birthDate: "27 ส.ค. 2560", className: "ป.5/1", parentName: "นายสมพงษ์ พรมมา", parentPhone: "081-234-0008", address: "19 หมู่ 6 ต.บางเมือง อ.เมือง จ.สมุทรปราการ 10270", status: "กำลังศึกษา" },
  { id: "s-009", name: "เด็กชายณัฐพล ขันทอง", birthDate: "14 เม.ย. 2560", className: "ป.5/1", parentName: "นางทองใบ ขันทอง", parentPhone: "081-234-0009", address: "333 หมู่ 10 ต.คลองด่าน อ.บางบ่อ จ.สมุทรปราการ 10550", status: "กำลังศึกษา" },
  { id: "s-010", name: "เด็กหญิงมณีรัตน์ สุขสันต์", birthDate: "8 ธ.ค. 2560", className: "ป.5/1", parentName: "นายไพศาล สุขสันต์", parentPhone: "081-234-0010", address: "64/2 หมู่ 1 ต.บางบ่อ อ.บางบ่อ จ.สมุทรปราการ 10560", status: "กำลังศึกษา" },
  { id: "s-011", name: "เด็กชายกิตติพงษ์ แก้วใส", birthDate: "21 ก.พ. 2555", className: "ม.1/1", parentName: "นางสมพิศ แก้วใส", parentPhone: "081-234-0011", address: "150 หมู่ 7 ต.บางพลีใหญ่ อ.บางพลี จ.สมุทรปราการ 10540", status: "กำลังศึกษา" },
  { id: "s-012", name: "เด็กหญิงอรอุมา ใจบุญ", birthDate: "3 ก.ย. 2555", className: "ม.1/1", parentName: "นายอำนาจ ใจบุญ", parentPhone: "081-234-0012", address: "9/1 หมู่ 4 ต.ราชาเทวะ อ.บางพลี จ.สมุทรปราการ 10540", status: "กำลังศึกษา" },
  { id: "s-013", name: "เด็กชายพีรพัฒน์ ทรัพย์เจริญ", birthDate: "17 พ.ค. 2555", className: "ม.1/1", parentName: "นางสาวกานดา ทรัพย์เจริญ", parentPhone: "081-234-0013", address: "201 ถ.ศรีนครินทร์ ต.สำโรงเหนือ อ.เมือง จ.สมุทรปราการ 10270", status: "กำลังศึกษา" },
  { id: "s-014", name: "เด็กหญิงจิดาภา วัฒนา", birthDate: "29 ต.ค. 2555", className: "ม.1/1", parentName: "นายกิตติ วัฒนา", parentPhone: "081-234-0014", address: "48 หมู่ 11 ต.บางแก้ว อ.บางพลี จ.สมุทรปราการ 10540", status: "กำลังศึกษา" },
  { id: "s-015", name: "เด็กชายศุภกร หมื่นแก้ว", birthDate: "11 มิ.ย. 2555", className: "ม.1/1", parentName: "นางบุญเรือน หมื่นแก้ว", parentPhone: "081-234-0015", address: "275 หมู่ 2 ต.บางเสาธง อ.บางเสาธง จ.สมุทรปราการ 10570", status: "กำลังศึกษา" },
  { id: "s-016", name: "เด็กหญิงปาริชาติ แก้วกุล", birthDate: "6 ส.ค. 2560", className: "ป.4/1", parentName: "นายชูชาติ แก้วกุล", parentPhone: "081-234-0016", address: "102 หมู่ 5 ต.บางพลีใหญ่ อ.บางพลี จ.สมุทรปราการ 10540", status: "ย้ายออก", note: "ย้ายไปโรงเรียนบ้านคลองบางแก้ว เมื่อ 15 ก.ค. 2569" },
  { id: "s-017", name: "เด็กชายธีรภัทร อยู่เย็น", birthDate: "23 มี.ค. 2553", className: "ป.6/1", parentName: "นางสำเนียง อยู่เย็น", parentPhone: "081-234-0017", address: "58/3 หมู่ 8 ต.บางแก้ว อ.บางพลี จ.สมุทรปราการ 10540", status: "จบการศึกษา", note: "จบชั้น ป.6 ปีการศึกษา 2565" },
  { id: "s-018", name: "เด็กชายชลสิทธิ์ ปานทอง", birthDate: "12 ม.ค. 2560", className: "ป.5/1", parentName: "นายประหยัด ปานทอง", parentPhone: "081-234-0018", address: "7 หมู่ 6 ต.บางเมือง อ.เมือง จ.สมุทรปราการ 10270", status: "ย้ายออก", note: "ย้ายไปศึกษาต่อต่างจังหวัด เมื่อ 10 พ.ค. 2569" },
];

export const LOCAL_SCHOLARSHIP: ScholarshipData = {
  programs: [
    { id: "p-001", name: "ทุนเรียนดี", sponsor: "มูลนิธิเพื่อการศึกษาไทย", amount: 3000, criteria: "ผลการเรียนเฉลี่ย 3.50 ขึ้นไป และความประพฤติดี", deadline: "30 ก.ย. 2569" },
    { id: "p-002", name: "ทุนนักเรียนยากจนพิเศษ", sponsor: "องค์การบริหารส่วนจังหวัดสมุทรปราการ", amount: 5000, criteria: "รายได้ครัวเรือนไม่เกิน 3,000 บาท/เดือน", deadline: "15 ต.ค. 2569" },
    { id: "p-003", name: "ทุนกีฬาดีเด่น", sponsor: "ชมรมผู้ปกครองและครูโรงเรียนสาธิต", amount: 2000, criteria: "เป็นนักกีฬาตัวแทนโรงเรียน และมีผลการเรียนเฉลี่ย 2.50 ขึ้นไป", deadline: "31 ต.ค. 2569" },
  ],
  eligibleStudents: [
    { programId: "p-001", studentId: "s-002", status: "อนุมัติ" },
    { programId: "p-001", studentId: "s-012", status: "รอตรวจ" },
    { programId: "p-001", studentId: "s-014", status: "รอตรวจ" },
    { programId: "p-001", studentId: "s-010", status: "ปฏิเสธ" },
    { programId: "p-002", studentId: "s-003", status: "รอตรวจ" },
    { programId: "p-002", studentId: "s-008", status: "อนุมัติ" },
    { programId: "p-002", studentId: "s-013", status: "รอตรวจ" },
    { programId: "p-002", studentId: "s-009", status: "รอตรวจ" },
    { programId: "p-003", studentId: "s-005", status: "อนุมัติ" },
    { programId: "p-003", studentId: "s-011", status: "รอตรวจ" },
    { programId: "p-003", studentId: "s-007", status: "ปฏิเสธ" },
  ],
};

export const LOCAL_HEALTH: HealthRecord[] = [
  { studentId: "s-001", term: "ภาคเรียนที่ 2/2568", heightCm: 128.0, weightKg: 27.0, bmi: 16.5, vision: "ปกติ", note: "สุขภาพแข็งแรง" },
  { studentId: "s-001", term: "ภาคเรียนที่ 1/2569", heightCm: 130.0, weightKg: 28.5, bmi: 16.9, vision: "ปกติ", note: "สุขภาพแข็งแรง" },
  { studentId: "s-002", term: "ภาคเรียนที่ 2/2568", heightCm: 126.5, weightKg: 25.0, bmi: 15.6, vision: "ปกติ", note: "สุขภาพแข็งแรง" },
  { studentId: "s-002", term: "ภาคเรียนที่ 1/2569", heightCm: 128.5, weightKg: 26.0, bmi: 15.7, vision: "ปกติ", note: "สุขภาพแข็งแรง" },
  { studentId: "s-003", term: "ภาคเรียนที่ 2/2568", heightCm: 125.0, weightKg: 23.0, bmi: 14.7, vision: "สายตาสั้นเล็กน้อย", note: "แนะนำตรวจวัดสายตาปีละครั้ง" },
  { studentId: "s-003", term: "ภาคเรียนที่ 1/2569", heightCm: 127.0, weightKg: 24.0, bmi: 14.9, vision: "สายตาสั้นเล็กน้อย", note: "กำลังใส่แว่นตา" },
  { studentId: "s-006", term: "ภาคเรียนที่ 2/2568", heightCm: 138.0, weightKg: 40.0, bmi: 21.0, vision: "ปกติ", note: "น้ำหนักมากกว่าเกณฑ์เล็กน้อย" },
  { studentId: "s-006", term: "ภาคเรียนที่ 1/2569", heightCm: 139.5, weightKg: 42.5, bmi: 21.8, vision: "ปกติ", note: "แนะนำออกกำลังกายสม่ำเสมอ" },
  { studentId: "s-008", term: "ภาคเรียนที่ 2/2568", heightCm: 136.0, weightKg: 31.0, bmi: 16.8, vision: "ปกติ", note: "สุขภาพแข็งแรง" },
  { studentId: "s-008", term: "ภาคเรียนที่ 1/2569", heightCm: 138.0, weightKg: 32.5, bmi: 17.1, vision: "ปกติ", note: "สุขภาพแข็งแรง" },
  { studentId: "s-012", term: "ภาคเรียนที่ 2/2568", heightCm: 152.0, weightKg: 44.0, bmi: 19.0, vision: "ปกติ", note: "สุขภาพแข็งแรง" },
  { studentId: "s-012", term: "ภาคเรียนที่ 1/2569", heightCm: 154.5, weightKg: 46.0, bmi: 19.3, vision: "ปกติ", note: "สุขภาพแข็งแรง" },
  { studentId: "s-015", term: "ภาคเรียนที่ 2/2568", heightCm: 150.0, weightKg: 38.0, bmi: 16.9, vision: "ปกติ", note: "สุขภาพแข็งแรง" },
  { studentId: "s-015", term: "ภาคเรียนที่ 1/2569", heightCm: 152.0, weightKg: 39.5, bmi: 17.1, vision: "ปกติ", note: "สุขภาพแข็งแรง" },
];

export const LOCAL_GUIDANCE: GuidanceData = {
  sessions: [
    { id: "g-001", date: "5 ส.ค. 2569", studentId: "s-003", topic: "ปรับตัวกับเพื่อนในชั้นเรียน", summary: "นักเรียนรู้สึกถูกแกล้งในห้องเรียน ครูแนะแนวให้เทคนิคการพูดกล้าแสดงออก", counselor: "ครูมยุรี ฉลาดคิด", followUp: "ติดตามผลภายใน 2 สัปดาห์" },
    { id: "g-002", date: "12 ส.ค. 2569", studentId: "s-008", topic: "การวางแผนการเรียนภาษาอังกฤษ", summary: "นักเรียนอยากพัฒนาทักษะภาษาอังกฤษ วางแผนเรียนพิเศษกับครูประจำวิชา", counselor: "ครูมยุรี ฉลาดคิด", followUp: "ตรวจสอบความก้าวหน้าปลายเดือน" },
    { id: "g-003", date: "19 ส.ค. 2569", studentId: "s-013", topic: "ความเครียดจากการสอบ", summary: "นักเรียนกังวลเรื่องผลสอบกลางภาค ฝึกเทคนิคการผ่อนคลายและจัดตารางอ่านหนังสือ", counselor: "ครูสมพร ปลอดภัย", followUp: "นัดพบซ้ำหลังสอบกลางภาค" },
    { id: "g-004", date: "26 ส.ค. 2569", studentId: "s-015", topic: "วางแผนศึกษาต่อ", summary: "นักเรียนสนใจสายอาชีพด้านช่างยนต์ ให้ข้อมูลโรงเรียนอาชีวะในจังหวัด", counselor: "ครูสมพร ปลอดภัย", followUp: "พานักเรียนไปงานเปิดบ้านอาชีวะ ก.ย. 2569" },
    { id: "g-005", date: "2 ก.ย. 2569", studentId: "s-012", topic: "การสมัครแข่งขันวิชาการ", summary: "นักเรียนต้องการสมัครแข่งขันตอบปัญหาวิทยาศาสตร์ระดับจังหวัด ประสานครูพี่เลี้ยงให้", counselor: "ครูมยุรี ฉลาดคิด", followUp: "ยื่นใบสมัครภายใน 15 ก.ย. 2569" },
  ],
  appointments: [
    { id: "a-001", date: "9 ก.ย. 2569", studentId: "s-004", reason: "ปัญหาการบ้านไม่ส่งบ่อยครั้ง", status: "รอพบ" },
    { id: "a-002", date: "10 ก.ย. 2569", studentId: "s-009", reason: "พฤติกรรมไม่ตั้งใจเรียนในคาบบ่าย", status: "รอพบ" },
    { id: "a-003", date: "6 ส.ค. 2569", studentId: "s-003", reason: "ติดตามผลการปรับตัวกับเพื่อน", status: "พบแล้ว" },
    { id: "a-004", date: "16 ก.ย. 2569", studentId: "s-007", reason: "ผู้ปกครองขอคำปรึกษาเรื่องการเรียน", status: "เลื่อนนัด" },
  ],
};

export const LOCAL_IEP: IepPlan[] = [
  {
    id: "iep-001",
    studentId: "s-003",
    riskFactors: ["สมาธิสั้น", "อ่านไม่ออกคล่อง"],
    goals: [
      "อ่านหนังสือได้ 40 คำต่อนาที ภายใน 3 เดือน",
      "ทำการบ้านส่งครบ 8 ใน 10 สัปดาห์",
      "ควบคุมอารมณ์เมื่อถูกเพื่อนยั่ว ใช้คำพูดแทนการตอบโต้",
    ],
    supportMeasures: [
      "จัดที่นั่งหน้าห้องใกล้ครูประจำชั้น",
      "แบบฝึกอ่านเพิ่มเติมสัปดาห์ละ 3 วัน กับครูภาษาไทย",
      "พี่เลี้ยงช่วยเหลือการบ้านหลังเลิกเรียน",
      "ประชุมผู้ปกครองทุกเดือน",
    ],
    reviewDate: "15 ก.พ. 2570",
    status: "ดำเนินการ",
  },
  {
    id: "iep-002",
    studentId: "s-009",
    riskFactors: ["เรียนช้าด้านคณิตศาสตร์", "ขาดเรียนบ่อย"],
    goals: [
      "ทำโจทย์การบวก-ลบเศษส่วนได้ถูกต้อง 80%",
      "เข้าเรียนครบ 95% ของวันเรียน",
    ],
    supportMeasures: [
      "สอนเสริมคณิตศาสตร์สัปดาห์ละ 2 คาบ",
      "ติดตามการมาเรียนกับผู้ปกครองทุกสัปดาห์",
      "ใช้สื่อการเรียนรู้ที่หลากหลายในการสอน",
    ],
    reviewDate: "20 มี.ค. 2570",
    status: "ดำเนินการ",
  },
  {
    id: "iep-003",
    studentId: "s-015",
    riskFactors: ["ซึมเศร้าเล็กน้อย", "ความภาคภูมิใจในตนเองต่ำ"],
    goals: [
      "เข้าร่วมกิจกรรมชมรมอย่างน้อยสัปดาห์ละ 1 ครั้ง",
      "เล่าเรื่องความสำเร็จเล็กๆ ของตัวเองได้สัปดาห์ละ 1 เรื่อง",
    ],
    supportMeasures: [
      "เข้ารับคำปรึกษากับครูแนะแนวทุกสัปดาห์",
      "ครูประจำชั้นให้กำลังใจและชื่นชมความสำเร็จ",
      "ชวนเข้าร่วมชมรมดนตรีที่นักเรียนสนใจ",
    ],
    reviewDate: "10 ม.ค. 2570",
    status: "รอประเมิน",
  },
];

export async function fetchParentPortal(): Promise<ParentPortalData> {
  try {
    const res = await fetch(`${API_URL}/api/demo/parent-portal`, {
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) throw new Error(`backend ${res.status}`);
    return (await res.json()) as ParentPortalData;
  } catch {
    if (!DEMO_MODE) throw new Error("backend unavailable");
    return LOCAL_PARENT_PORTAL;
  }
}

export async function fetchStudentRegistry(): Promise<RegistryStudent[]> {
  try {
    const res = await fetch(`${API_URL}/api/demo/registry`, {
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) throw new Error(`backend ${res.status}`);
    return (await res.json()) as RegistryStudent[];
  } catch {
    if (!DEMO_MODE) throw new Error("backend unavailable");
    return LOCAL_REGISTRY;
  }
}

export async function fetchScholarship(): Promise<ScholarshipData> {
  try {
    const res = await fetch(`${API_URL}/api/demo/scholarship`, {
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) throw new Error(`backend ${res.status}`);
    return (await res.json()) as ScholarshipData;
  } catch {
    if (!DEMO_MODE) throw new Error("backend unavailable");
    return LOCAL_SCHOLARSHIP;
  }
}

export async function fetchHealth(): Promise<HealthRecord[]> {
  try {
    const res = await fetch(`${API_URL}/api/demo/health`, {
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) throw new Error(`backend ${res.status}`);
    return (await res.json()) as HealthRecord[];
  } catch {
    if (!DEMO_MODE) throw new Error("backend unavailable");
    return LOCAL_HEALTH;
  }
}

export async function fetchGuidance(): Promise<GuidanceData> {
  try {
    const res = await fetch(`${API_URL}/api/demo/guidance`, {
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) throw new Error(`backend ${res.status}`);
    return (await res.json()) as GuidanceData;
  } catch {
    if (!DEMO_MODE) throw new Error("backend unavailable");
    return LOCAL_GUIDANCE;
  }
}

export async function fetchIep(): Promise<IepPlan[]> {
  try {
    const res = await fetch(`${API_URL}/api/demo/iep`, {
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) throw new Error(`backend ${res.status}`);
    return (await res.json()) as IepPlan[];
  } catch {
    if (!DEMO_MODE) throw new Error("backend unavailable");
    return LOCAL_IEP;
  }
}
