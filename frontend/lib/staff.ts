// Mock staff/admin demo features (บุคลากร, การลา, ว.PA, งบประมาณ/พัสดุ,
// ห้องสมุด, อาหารกลางวัน, อาคารสถานที่) — deterministic synthetic data (PDPA).
// Each fetch tries the backend /api/demo/* endpoint first and falls back to
// the local mirror when the backend is unreachable (demo mode only).

export interface Teacher {
  id: string;
  name: string;
  position: string;
  academicStanding: string;
  subjects: string[];
  workloadHours: number;
  phone: string;
}

export interface LeaveRequest {
  id: string;
  teacherId: string;
  teacherName: string;
  type: string;
  startDate: string;
  days: number;
  reason: string;
  status: string;
}

export interface EvalCriterion {
  id: string;
  name: string;
  weightPct: number;
  selfScore: number;
  evidence: string[];
}

export interface TeacherEval {
  teacher: { id: string; name: string };
  criteria: EvalCriterion[];
  summary: { totalScore: number; level: string };
}

export interface BudgetRow {
  category: string;
  allocated: number;
  spent: number;
}

export interface InventoryItem {
  id: string;
  name: string;
  category: string;
  quantity: number;
  condition: string;
}

export interface BudgetData {
  budget: BudgetRow[];
  inventory: InventoryItem[];
}

export interface Book {
  id: string;
  title: string;
  author: string;
  isbn: string;
  category: string;
  available: boolean;
}

export interface Loan {
  bookId: string;
  studentId: string;
  borrowDate: string;
  dueDate: string;
  returned: boolean;
}

export interface LibraryData {
  books: Book[];
  loans: Loan[];
}

export interface LunchDay {
  day: string;
  menu: string[];
  ingredientCost: number;
  perHead: number;
}

export interface LunchData {
  weekMenu: LunchDay[];
  studentCount: number;
  weeklyCost: number;
}

export interface FacilityRequest {
  id: string;
  room: string;
  issue: string;
  priority: string;
  status: string;
}

export interface RoomInfo {
  name: string;
  condition: string;
  lastInspection: string;
}

export interface FacilitiesData {
  requests: FacilityRequest[];
  rooms: RoomInfo[];
}

const API_URL =
  process.env.SOLVEN_BACKEND_URL ??
  process.env.NEXT_PUBLIC_SOLVEN_API_URL ??
  "http://localhost:8000";

const DEMO_MODE = process.env.NEXT_PUBLIC_SOLVEN_MODE === "demo";

export const LOCAL_STAFF: Teacher[] = [
  { id: "t-001", name: "นางสาวสมหญิง ใจดี", position: "ครู", academicStanding: "ชำนาญการ", subjects: ["คณิตศาสตร์", "วิทยาศาสตร์"], workloadHours: 18, phone: "081-234-0101" },
  { id: "t-002", name: "นายสมชาย มากมี", position: "ครู", academicStanding: "ชำนาญการพิเศษ", subjects: ["ภาษาไทย", "สังคมศึกษา"], workloadHours: 16, phone: "081-234-0102" },
  { id: "t-003", name: "นายประเสริฐ สุขสันต์", position: "ครู", academicStanding: "ชำนาญการ", subjects: ["ภาษาอังกฤษ"], workloadHours: 20, phone: "081-234-0103" },
  { id: "t-004", name: "นางสาวมณีรัตน์ ศรีสุข", position: "ครู", academicStanding: "เชี่ยวชาญ", subjects: ["คณิตศาสตร์"], workloadHours: 14, phone: "081-234-0104" },
  { id: "t-005", name: "นายธนกร วงษ์คำ", position: "ครู", academicStanding: "ชำนาญการ", subjects: ["พลศึกษา", "สุขศึกษา"], workloadHours: 19, phone: "081-234-0105" },
  { id: "t-006", name: "นางสาวอรอุมา ใจบุญ", position: "ครู", academicStanding: "ชำนาญการพิเศษ", subjects: ["ศิลปะ", "ดนตรี"], workloadHours: 17, phone: "081-234-0106" },
];

export const LOCAL_LEAVES: LeaveRequest[] = [
  { id: "leave-001", teacherId: "t-001", teacherName: "นางสาวสมหญิง ใจดี", type: "ลาป่วย", startDate: "2026-08-18", days: 2, reason: "ปวดท้องเฉียบพลัน พบแพทย์", status: "รออนุมัติ" },
  { id: "leave-002", teacherId: "t-002", teacherName: "นายสมชาย มากมี", type: "ลากิจ", startDate: "2026-08-20", days: 1, reason: "ธุระส่วนตัว", status: "อนุมัติ" },
  { id: "leave-003", teacherId: "t-005", teacherName: "นายธนกร วงษ์คำ", type: "ลาคลอด", startDate: "2026-09-01", days: 45, reason: "คลอดบุตร (ภรรยา)", status: "อนุมัติ" },
  { id: "leave-004", teacherId: "t-003", teacherName: "นายประเสริฐ สุขสันต์", type: "ลาพักผ่อน", startDate: "2026-08-24", days: 3, reason: "พักผ่อนประจำปี", status: "รออนุมัติ" },
  { id: "leave-005", teacherId: "t-006", teacherName: "นางสาวอรอุมา ใจบุญ", type: "ลาป่วย", startDate: "2026-08-17", days: 1, reason: "พบแพทย์นัดตรวจ", status: "ปฏิเสธ" },
];

export const LOCAL_TEACHER_EVAL: TeacherEval = {
  teacher: { id: "t-001", name: "นางสาวสมหญิง ใจดี" },
  criteria: [
    { id: "ev-c1", name: "ด้านการจัดการเรียนรู้", weightPct: 40, selfScore: 95, evidence: ["แผนการจัดการเรียนรู้ที่เน้นผู้เรียนเป็นสำคัญ", "ชิ้นงาน/ร่องรอยการเรียนรู้ของนักเรียน"] },
    { id: "ev-c2", name: "ด้านการบริหารจัดการชั้นเรียน", weightPct: 20, selfScore: 90, evidence: ["บันทึกหลังสอนและสถิติการมาเรียน", "ภาพบรรยากาศชั้นเรียนเชิงบวก"] },
    { id: "ev-c3", name: "ด้านการพัฒนาตนเองและวิชาชีพ", weightPct: 20, selfScore: 88, evidence: ["เกียรติบัตรการเข้าร่วมอบรม", "รายงานการประเมินตนเอง (SAR)"] },
    { id: "ev-c4", name: "ด้านการมีส่วนร่วมกับชุมชนการเรียนรู้", weightPct: 20, selfScore: 92, evidence: ["บันทึก PLC รายสัปดาห์", "ภาพกิจกรรมร่วมกับชุมชน"] },
  ],
  summary: { totalScore: 92.0, level: "ดีเด่น" },
};

export const LOCAL_BUDGET: BudgetData = {
  budget: [
    { category: "วัสดุการศึกษา", allocated: 120000, spent: 86500 },
    { category: "ครุภัณฑ์", allocated: 250000, spent: 120000 },
    { category: "อาหารกลางวัน", allocated: 480000, spent: 245000 },
    { category: "ค่าสาธารณูปโภค", allocated: 60000, spent: 42500 },
    { category: "กิจกรรมพัฒนาผู้เรียน", allocated: 80000, spent: 15000 },
  ],
  inventory: [
    { id: "inv-001", name: "เครื่องพิมพ์เลเซอร์", category: "ครุภัณฑ์", quantity: 3, condition: "ดี" },
    { id: "inv-002", name: "คอมพิวเตอร์ตั้งโต๊ะ", category: "ครุภัณฑ์", quantity: 12, condition: "ดี" },
    { id: "inv-003", name: "โปรเจกเตอร์", category: "ครุภัณฑ์", quantity: 5, condition: "ซ่อม" },
    { id: "inv-004", name: "โต๊ะนักเรียน", category: "ครุภัณฑ์", quantity: 80, condition: "ชำรุด" },
    { id: "inv-005", name: "กระดาษ A4", category: "วัสดุ", quantity: 45, condition: "ดี" },
    { id: "inv-006", name: "สีโปสเตอร์", category: "วัสดุ", quantity: 60, condition: "ดี" },
    { id: "inv-007", name: "พัดลมเพดาน", category: "ครุภัณฑ์", quantity: 10, condition: "ซ่อม" },
  ],
};

export const LOCAL_LIBRARY: LibraryData = {
  books: [
    { id: "lib-001", title: "นิทานอีสป ฉบับเยาวชน", author: "กรมพระยาดำรงราชานุภาพ (เรียบเรียง)", isbn: "978-974-123-001-1", category: "นิทาน", available: true },
    { id: "lib-002", title: "หนังสือเรียนคณิตศาสตร์ ป.4", author: "สสวท.", isbn: "978-974-123-002-8", category: "วิชาการ", available: true },
    { id: "lib-003", title: "พจนานุกรมไทยฉบับนักเรียน", author: "ราชบัณฑิตยสภา", isbn: "978-974-123-003-5", category: "อ้างอิง", available: false },
    { id: "lib-004", title: "วิทยาศาสตร์รอบตัวเรา", author: "สำนักพิมพ์ห้องเรียน", isbn: "978-974-123-004-2", category: "วิทยาศาสตร์", available: true },
    { id: "lib-005", title: "พระอภัยมณี (ฉบับเยาวชน)", author: "สุนทรภู่", isbn: "978-974-123-005-9", category: "วรรณกรรม", available: true },
    { id: "lib-006", title: "โลกใบเล็กของน้องแมว", author: "นักเขียนตัวอย่าง", isbn: "978-974-123-006-6", category: "นิทาน", available: true },
    { id: "lib-007", title: "แบบฝึกหัดภาษาอังกฤษ ป.5", author: "ฝ่ายวิชาการ", isbn: "978-974-123-007-3", category: "วิชาการ", available: false },
    { id: "lib-008", title: "สารานุกรมไทยสำหรับเยาวชน เล่ม 1", author: "โครงการสารานุกรมไทย", isbn: "978-974-123-008-0", category: "อ้างอิง", available: true },
  ],
  loans: [
    { bookId: "lib-003", studentId: "s-001", borrowDate: "2026-08-10", dueDate: "2026-08-24", returned: false },
    { bookId: "lib-007", studentId: "s-007", borrowDate: "2026-08-12", dueDate: "2026-08-26", returned: false },
    { bookId: "lib-002", studentId: "s-012", borrowDate: "2026-08-05", dueDate: "2026-08-19", returned: true },
  ],
};

export const LOCAL_LUNCH: LunchData = {
  weekMenu: [
    { day: "จันทร์", menu: ["ข้าวผัดไก่", "ผักสด", "น้ำผลไม้"], ingredientCost: 1250, perHead: 35 },
    { day: "อังคาร", menu: ["ก๋วยเตี๋ยวน้ำใส", "ไข่ต้ม", "ผลไม้ตามฤดูกาล"], ingredientCost: 980, perHead: 32 },
    { day: "พุธ", menu: ["ข้าวมันไก่", "ซุปฟักทอง", "นมจืด"], ingredientCost: 1350, perHead: 36 },
    { day: "พฤหัสบดี", menu: ["ผัดไทยกุ้งสด", "ถั่วงอก", "ส้ม"], ingredientCost: 1420, perHead: 38 },
    { day: "ศุกร์", menu: ["ข้าวราดแกงเขียวหวานไก่", "ไข่เจียว", "แตงโม"], ingredientCost: 1180, perHead: 34 },
  ],
  studentCount: 245,
  weeklyCost: 6180,
};

export const LOCAL_FACILITIES: FacilitiesData = {
  requests: [
    { id: "fr-001", room: "ห้องเรียน ป.4/1", issue: "พัดลมเพดานหมุนดังและสั่น", priority: "สูง", status: "รอซ่อม" },
    { id: "fr-002", room: "ห้องน้ำชาย ชั้น 1", issue: "ก๊อกน้ำรั่ว", priority: "กลาง", status: "ซ่อมเสร็จ" },
    { id: "fr-003", room: "ห้องสมุด", issue: "หลอดไฟสว่างน้อย", priority: "ต่ำ", status: "รอซ่อม" },
    { id: "fr-004", room: "สนามกีฬา", issue: "ตาข่ายฟุตบอลฉีกขาด", priority: "กลาง", status: "รอซ่อม" },
  ],
  rooms: [
    { name: "ห้องเรียน ป.4/1", condition: "ดี", lastInspection: "2026-07-15" },
    { name: "ห้องเรียน ป.5/1", condition: "ดี", lastInspection: "2026-07-15" },
    { name: "ห้องเรียน ม.1/1", condition: "พอใช้", lastInspection: "2026-06-28" },
    { name: "ห้องสมุด", condition: "พอใช้", lastInspection: "2026-06-28" },
    { name: "ห้องน้ำนักเรียน", condition: "ชำรุด", lastInspection: "2026-06-10" },
    { name: "สนามกีฬา", condition: "ดี", lastInspection: "2026-08-01" },
  ],
};

async function fetchJson<T>(path: string, fallback: T): Promise<T> {
  try {
    const res = await fetch(`${API_URL}/api/demo/${path}`, {
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) throw new Error(`backend ${res.status}`);
    return (await res.json()) as T;
  } catch {
    if (!DEMO_MODE) throw new Error("backend unreachable");
    return fallback;
  }
}

export function fetchStaff(): Promise<Teacher[]> {
  return fetchJson<Teacher[]>("staff", LOCAL_STAFF);
}

export function fetchLeaves(): Promise<LeaveRequest[]> {
  return fetchJson<LeaveRequest[]>("leaves", LOCAL_LEAVES);
}

export function fetchTeacherEval(): Promise<TeacherEval> {
  return fetchJson<TeacherEval>("teacher-eval", LOCAL_TEACHER_EVAL);
}

export function fetchBudget(): Promise<BudgetData> {
  return fetchJson<BudgetData>("budget", LOCAL_BUDGET);
}

export function fetchLibrary(): Promise<LibraryData> {
  return fetchJson<LibraryData>("library", LOCAL_LIBRARY);
}

export function fetchLunch(): Promise<LunchData> {
  return fetchJson<LunchData>("lunch", LOCAL_LUNCH);
}

export function fetchFacilities(): Promise<FacilitiesData> {
  return fetchJson<FacilitiesData>("facilities", LOCAL_FACILITIES);
}
