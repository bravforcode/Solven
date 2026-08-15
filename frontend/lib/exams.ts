// Mock question bank + exam generator (feature 9: คลังข้อสอบ/สร้างข้อสอบ).
// Deterministic demo data mirroring backend /api/demo/questions + /api/demo/exams/generate.

export interface Question {
  id: string;
  subject: string;
  grade: string;
  topic: string;
  text: string;
  choices?: string[];
  answer: string;
  difficulty: "ง่าย" | "ปานกลาง" | "ยาก";
}

export interface GeneratedExam {
  examId: string;
  subject: string;
  grade: string;
  title: string;
  questions: Question[];
  answerKey: Record<string, string>;
  generatedBy: string;
}

const API_URL =
  process.env.SOLVEN_BACKEND_URL ??
  process.env.NEXT_PUBLIC_SOLVEN_API_URL ??
  "http://localhost:8000";

const DEMO_MODE = process.env.NEXT_PUBLIC_SOLVEN_MODE === "demo";

export const LOCAL_QUESTIONS: Question[] = [
  { id: "q-001", subject: "คณิตศาสตร์", grade: "ป.5", topic: "เศษส่วน", text: "1/2 + 1/2 เท่ากับเท่าใด", choices: ["1", "2/4", "1/4", "2"], answer: "1", difficulty: "ง่าย" },
  { id: "q-002", subject: "คณิตศาสตร์", grade: "ป.5", topic: "เศษส่วน", text: "เศษส่วน 2/4 เท่ากับเศษส่วนข้อใด", choices: ["1/2", "1/4", "3/4", "2/2"], answer: "1/2", difficulty: "ปานกลาง" },
  { id: "q-003", subject: "คณิตศาสตร์", grade: "ป.5", topic: "การคูณ", text: "5 x 8 เท่ากับเท่าใด", choices: ["35", "40", "45", "48"], answer: "40", difficulty: "ง่าย" },
  { id: "q-004", subject: "คณิตศาสตร์", grade: "ป.5", topic: "พื้นที่", text: "พื้นที่สามเหลี่ยมฐาน 6 ซม. สูง 4 ซม. เท่ากับเท่าใด", choices: ["24 ตร.ซม.", "12 ตร.ซม.", "10 ตร.ซม.", "48 ตร.ซม."], answer: "12 ตร.ซม.", difficulty: "ปานกลาง" },
  { id: "q-005", subject: "คณิตศาสตร์", grade: "ป.5", topic: "สมการ", text: "x + 3 = 10 แล้ว x เท่ากับเท่าใด", choices: ["3", "7", "10", "13"], answer: "7", difficulty: "ปานกลาง" },
  { id: "q-006", subject: "วิทยาศาสตร์", grade: "ป.4", topic: "วัฏจักรน้ำ", text: "น้ำระเหยกลายเป็นอะไร", choices: ["ไอน้ำ", "น้ำแข็ง", "ฝน", "ทะเล"], answer: "ไอน้ำ", difficulty: "ง่าย" },
  { id: "q-007", subject: "วิทยาศาสตร์", grade: "ป.4", topic: "พืช", text: "พืชหายใจด้วยอวัยวะใด", choices: ["ปากใบ", "ราก", "ลำต้น", "ดอก"], answer: "ปากใบ", difficulty: "ปานกลาง" },
  { id: "q-008", subject: "ภาษาไทย", grade: "ป.4", topic: "การอ่าน", text: "ข้อใดเป็นใจความสำคัญของเรื่องที่อ่าน", choices: ["ชื่อเรื่อง", "ประโยคที่บอกสาระหลัก", "คำศัพท์ยาก", "ชื่อผู้แต่ง"], answer: "ประโยคที่บอกสาระหลัก", difficulty: "ปานกลาง" },
  { id: "q-009", subject: "ภาษาไทย", grade: "ป.4", topic: "คำราชาศัพท์", text: "คำว่า 'เสด็จ' ใช้กับใคร", choices: ["พระมหากษัตริย์", "ครู", "พ่อแม่", "เพื่อน"], answer: "พระมหากษัตริย์", difficulty: "ยาก" },
  { id: "q-010", subject: "สังคมศึกษา", grade: "ป.5", topic: "ภูมิศาสตร์", text: "แม่น้ำเจ้าพระยาไหลลงสู่ทะเลใด", choices: ["อ่าวไทย", "ทะเลอันดามัน", "ทะเลจีนใต้", "อ่าวเบงกอล"], answer: "อ่าวไทย", difficulty: "ปานกลาง" },
];

export async function fetchQuestions(
  subject?: string,
  grade?: string
): Promise<Question[]> {
  try {
    const params = new URLSearchParams();
    if (subject) params.set("subject", subject);
    if (grade) params.set("grade", grade);
    const res = await fetch(`${API_URL}/api/demo/questions?${params}`, {
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) throw new Error(`backend ${res.status}`);
    return (await res.json()) as Question[];
  } catch {
    if (!DEMO_MODE) return [];
    return LOCAL_QUESTIONS.filter(
      (q) => (!subject || q.subject === subject) && (!grade || q.grade === grade)
    );
  }
}

export async function generateExam(
  subject: string,
  grade: string,
  count: number
): Promise<GeneratedExam> {
  try {
    const res = await fetch(`${API_URL}/api/demo/exams/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal: AbortSignal.timeout(8000),
      body: JSON.stringify({ subject, grade, count }),
    });
    if (!res.ok) throw new Error(`backend ${res.status}`);
    return (await res.json()) as GeneratedExam;
  } catch {
    if (!DEMO_MODE) throw new Error("backend unreachable");
    // Local deterministic mirror of backend generate_exam().
    const pool = LOCAL_QUESTIONS.filter(
      (q) => q.subject === subject && q.grade === grade
    );
    const picked = pool.length >= count ? pool.slice(0, count) : pool;
    const answerKey: Record<string, string> = {};
    for (const q of picked) answerKey[q.id] = q.answer;
    return {
      examId: `exam-${subject}-${grade}-${count}`,
      subject,
      grade,
      title: `ข้อสอบ${subject} ชั้น${grade} (${count} ข้อ)`,
      questions: picked,
      answerKey,
      generatedBy: "mock-exam-v1",
    };
  }
}