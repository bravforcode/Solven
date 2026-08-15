// Teaching workstream lib (งานสอน): ตารางสอน, การบ้าน, ข้อสอบออนไลน์,
// แผนการเรียนรู้รายปี, PLC, วิจัยในชั้นเรียน, สื่อการเรียนรู้.
// Tries the backend /api/demo/* endpoints first; falls back to the local
// mirrors when the backend is unreachable (demo mode only).
// All data deterministic + synthetic Thai demo data (PDPA).

export interface TimetableCell {
  period: number;
  time: string;
  subject: string;
  className: string;
  teacher: string;
}

export interface Timetable {
  days: string[];
  periods: { no: number; time: string }[];
  grid: Record<string, TimetableCell[]>;
}

export type HomeworkStatus = "assigned" | "submitted" | "graded";

export interface Homework {
  id: string;
  subject: string;
  className: string;
  title: string;
  dueDate: string;
  status: HomeworkStatus;
}

export interface ExamQuestion {
  no: number;
  question: string;
  choices: string[];
}

export interface ExamRunner {
  id: string;
  title: string;
  subject: string;
  questions: ExamQuestion[];
  answerKey: { no: number; answer: number }[];
  totalQuestions: number;
}

export type UnitStatus = "plan" | "teaching" | "done";

export interface CurriculumUnit {
  title: string;
  indicators: string[];
  weeks: number;
  status: UnitStatus;
}

export interface CurriculumSubject {
  subject: string;
  units: CurriculumUnit[];
}

export interface PlcComment {
  author: string;
  body: string;
}

export interface PlcPost {
  id: string;
  author: string;
  title: string;
  body: string;
  likes: number;
  comments: PlcComment[];
}

export interface PlcFeed {
  posts: PlcPost[];
}

export type ResearchStatus = "done" | "running" | "draft";

export interface ResearchProject {
  id: string;
  title: string;
  teacher: string;
  status: ResearchStatus;
  pretestAvg: number;
  posttestAvg: number;
  gain: number;
}

export interface MediaItem {
  id: string;
  title: string;
  type: string;
  subject: string;
  grade: string;
  downloads: number;
}

const API_URL =
  process.env.SOLVEN_BACKEND_URL ??
  process.env.NEXT_PUBLIC_SOLVEN_API_URL ??
  "http://localhost:8000";

const DEMO_MODE = process.env.NEXT_PUBLIC_SOLVEN_MODE === "demo";

// ---------------------------------------------------------------------------
// Local mirrors (deterministic — same output every call, no Math.random)
// ---------------------------------------------------------------------------

const TIMETABLE_DAYS = ["จันทร์", "อังคาร", "พุธ", "พฤหัสบดี", "ศุกร์"];
const TIMETABLE_PERIOD_TIMES = [
  "08:30–09:20", "09:20–10:10", "10:25–11:15", "11:15–12:05",
  "13:00–13:50", "13:50–14:40", "14:50–15:40", "15:40–16:30",
];
const TIMETABLE_SCHEDULES: Record<string, string[]> = {
  "ป.4/1": ["คณิตศาสตร์", "ภาษาไทย", "วิทยาศาสตร์", "ภาษาอังกฤษ", "สังคมศึกษา", "สุขศึกษา", "ศิลปะ", "การงานอาชีพ"],
  "ป.5/1": ["ภาษาไทย", "คณิตศาสตร์", "ภาษาอังกฤษ", "วิทยาศาสตร์", "สังคมศึกษา", "ศิลปะ", "สุขศึกษา", "การงานอาชีพ"],
  "ม.1/1": ["คณิตศาสตร์", "วิทยาศาสตร์", "ภาษาไทย", "ภาษาอังกฤษ", "สังคมศึกษา", "ประวัติศาสตร์", "ศิลปะ", "สุขศึกษา"],
};
const TIMETABLE_TEACHERS: Record<string, string> = {
  คณิตศาสตร์: "ครูนภา แก้วใส",
  ภาษาไทย: "ครูสมหญิง ใจดี",
  วิทยาศาสตร์: "ครูสมชาย มากมี",
  ภาษาอังกฤษ: "ครูแอนนา ศรีสุข",
  สังคมศึกษา: "ครูประเสริฐ สุขสันต์",
  สุขศึกษา: "ครูสมหญิง ใจดี",
  ศิลปะ: "ครูจินตนา พรมมา",
  การงานอาชีพ: "ครูประเสริฐ สุขสันต์",
  ประวัติศาสตร์: "ครูประเสริฐ สุขสันต์",
};

function buildLocalTimetable(): Timetable {
  // Deterministic builder mirroring backend timetable(): class rotates across
  // periods; subject comes from that class's own weekly rotation by day index.
  const classes = Object.keys(TIMETABLE_SCHEDULES);
  const grid: Record<string, TimetableCell[]> = {};
  for (let d = 0; d < 5; d += 1) {
    const cells: TimetableCell[] = [];
    for (let p = 0; p < 8; p += 1) {
      const cls = classes[(d + p) % 3];
      const subject = TIMETABLE_SCHEDULES[cls][(d + p) % 8];
      cells.push({
        period: p + 1,
        time: TIMETABLE_PERIOD_TIMES[p],
        subject,
        className: cls,
        teacher: TIMETABLE_TEACHERS[subject],
      });
    }
    grid[TIMETABLE_DAYS[d]] = cells;
  }
  return {
    days: TIMETABLE_DAYS,
    periods: TIMETABLE_PERIOD_TIMES.map((time, i) => ({ no: i + 1, time })),
    grid,
  };
}

export const LOCAL_TIMETABLE: Timetable = buildLocalTimetable();

export const LOCAL_HOMEWORK: Homework[] = [
  { id: "hw-001", subject: "คณิตศาสตร์", className: "ป.5/1", title: "แบบฝึกหัดเศษส่วน บทที่ 5 ข้อ 1–10", dueDate: "2026-08-18", status: "assigned" },
  { id: "hw-002", subject: "ภาษาไทย", className: "ป.4/1", title: "อ่านจับใจความนิทานเรื่อง กระต่ายกับเต่า แล้วสรุป 5 บรรทัด", dueDate: "2026-08-17", status: "assigned" },
  { id: "hw-003", subject: "วิทยาศาสตร์", className: "ป.4/1", title: "บันทึกการสังเกตวัฏจักรน้ำรอบบ้าน 7 วัน", dueDate: "2026-08-14", status: "submitted" },
  { id: "hw-004", subject: "คณิตศาสตร์", className: "ม.1/1", title: "แบบฝึกหัดสมการเชิงเส้นตัวแปรเดียว ชุดที่ 2 (ข้อ 1–8)", dueDate: "2026-08-15", status: "graded" },
  { id: "hw-005", subject: "ภาษาอังกฤษ", className: "ป.5/1", title: "เขียนประโยค Introduce yourself 5 ประโยค", dueDate: "2026-08-19", status: "assigned" },
  { id: "hw-006", subject: "สังคมศึกษา", className: "ป.4/1", title: "วาดแผนผังครอบครัวพร้อมระบุบทบาทสมาชิก", dueDate: "2026-08-12", status: "graded" },
  { id: "hw-007", subject: "ภาษาไทย", className: "ม.1/1", title: "แต่งคำประพันธ์ประเภทกลอนสี่ 1 บท ตามหัวข้อที่กำหนด", dueDate: "2026-08-13", status: "submitted" },
];

export const LOCAL_EXAM_RUNNER: ExamRunner = {
  id: "exam-run-demo-01",
  title: "ข้อสอบออนไลน์ชุดสาธิต (คณิตศาสตร์–ภาษาไทย ป.4–ป.5)",
  subject: "รวมวิชา",
  questions: [
    { no: 1, question: "ผลบวกของ 1/2 + 1/4 เท่ากับข้อใด", choices: ["1/6", "3/4", "2/6", "1/8"] },
    { no: 2, question: "สี่เหลี่ยมผืนผ้ากว้าง 6 ซม. ยาว 9 ซม. มีพื้นที่กี่ตารางเซนติเมตร", choices: ["54", "15", "30", "45"] },
    { no: 3, question: "ข้อใดใช้เครื่องหมายวรรคตอนถูกต้อง", choices: ["เธอไปตลาดหรือยัง", "เธอไปตลาดหรือยัง?", "เธอไปตลาดหรือยัง!", "เธอไปตลาดหรือยัง."] },
  ],
  answerKey: [
    { no: 1, answer: 1 },
    { no: 2, answer: 0 },
    { no: 3, answer: 1 },
  ],
  totalQuestions: 3,
};

export const LOCAL_CURRICULUM: CurriculumSubject[] = [
  {
    subject: "คณิตศาสตร์",
    units: [
      { title: "หน่วยที่ 1 จำนวนและการบวก ลบ คูณ หาร", indicators: ["ค1.1 ป.5/1", "ค1.1 ป.5/2"], weeks: 4, status: "done" },
      { title: "หน่วยที่ 2 เศษส่วนและการเปรียบเทียบ", indicators: ["ค1.1 ป.5/3", "ค1.1 ป.5/4"], weeks: 5, status: "teaching" },
      { title: "หน่วยที่ 3 เรขาคณิตและพื้นที่", indicators: ["ค2.2 ป.5/1", "ค2.2 ป.5/2"], weeks: 4, status: "plan" },
      { title: "หน่วยที่ 4 สถิติและความน่าจะเป็นเบื้องต้น", indicators: ["ค3.1 ป.5/1"], weeks: 3, status: "plan" },
    ],
  },
  {
    subject: "ภาษาไทย",
    units: [
      { title: "หน่วยที่ 1 การอ่านจับใจความสำคัญ", indicators: ["ท1.1 ป.4/3"], weeks: 4, status: "done" },
      { title: "หน่วยที่ 2 การเขียนสื่อสารและเรียงความ", indicators: ["ท2.1 ป.4/1", "ท2.1 ป.4/2"], weeks: 5, status: "teaching" },
      { title: "หน่วยที่ 3 วรรณคดีและวรรณกรรมพื้นบ้าน", indicators: ["ท5.1 ป.4/1"], weeks: 4, status: "plan" },
    ],
  },
  {
    subject: "วิทยาศาสตร์",
    units: [
      { title: "หน่วยที่ 1 วัฏจักรน้ำและอากาศ", indicators: ["ว3.1 ป.4/2"], weeks: 5, status: "teaching" },
      { title: "หน่วยที่ 2 พืชและสัตว์รอบตัวเรา", indicators: ["ว1.1 ป.4/1", "ว1.2 ป.4/2"], weeks: 4, status: "plan" },
      { title: "หน่วยที่ 3 แรงและพลังงาน", indicators: ["ว2.1 ป.4/3"], weeks: 5, status: "plan" },
    ],
  },
];

export const LOCAL_PLC_FEED: PlcFeed = {
  posts: [
    {
      id: "plc-001",
      author: "ครูสมหญิง ใจดี",
      title: "เทคนิคสอนเศษส่วนด้วยการตัดกระดาษ",
      body: "ทดลองใช้การพับ-ตัดกระดาษสอนเศษส่วน ป.5/1 พบว่านักเรียนเข้าใจเรื่องเศษส่วนเท่ากันเร็วขึ้นมาก แนะนำให้ลองใช้ดูครับ/ค่ะ",
      likes: 12,
      comments: [
        { author: "ครูสมชาย มากมี", body: "ขอลองใช้กับห้องผมสัปดาห์หน้าครับ" },
        { author: "ครูนภา แก้วใส", body: "ใช้กับ ม.1 ได้ด้วยไหมคะ" },
      ],
    },
    {
      id: "plc-002",
      author: "ครูสมชาย มากมี",
      title: "แก้ปัญหานักเรียนขาดเรียนซ้ำด้วยการเยี่ยมบ้าน",
      body: "เก็บข้อมูลนักเรียนเสี่ยง 5 คน พบสาเหตุหลักคือต้องช่วยงานบ้าน แนวทาง: ปรับการบ้านให้ยืดหยุ่น + ประสานผู้ปกครอง",
      likes: 8,
      comments: [{ author: "ครูประเสริฐ สุขสันต์", body: "มีแบบฟอร์มเยี่ยมบ้านให้แชร์ไหมครับ" }],
    },
    {
      id: "plc-003",
      author: "ครูนภา แก้วใส",
      title: "ใช้บัตรภาพฝึกภาษาอังกฤษ ม.1",
      body: "แชร์ชุดบัตรภาพคำศัพท์หมวดอาหาร ใช้เล่นเกมจับคู่ได้ทั้งคาบ ครบ 30 คน นักเรียนมีส่วนร่วมดี",
      likes: 5,
      comments: [],
    },
  ],
};

export const LOCAL_RESEARCH: ResearchProject[] = [
  { id: "r-001", title: "การพัฒนาผลสัมฤทธิ์เรื่องเศษส่วนด้วยสื่อภาพ สำหรับนักเรียนชั้น ป.5", teacher: "นางสาวสมหญิง ใจดี", status: "done", pretestAvg: 4.8, posttestAvg: 8.2, gain: 3.4 },
  { id: "r-002", title: "การเสริมทักษะการอ่านจับใจความด้วยนิทานพื้นบ้าน ชั้น ป.4", teacher: "นายสมชาย มากมี", status: "running", pretestAvg: 5.2, posttestAvg: 7.9, gain: 2.7 },
  { id: "r-003", title: "การใช้เกมบัตรภาพพัฒนาคำศัพท์ภาษาอังกฤษ ชั้น ม.1", teacher: "ครูนภา แก้วใส", status: "running", pretestAvg: 5.6, posttestAvg: 8.5, gain: 2.9 },
  { id: "r-004", title: "การลดพฤติกรรมมาเรียนสายด้วยระบบเพื่อนช่วยเพื่อน ชั้น ป.5", teacher: "นายประเสริฐ สุขสันต์", status: "draft", pretestAvg: 6.0, posttestAvg: 6.0, gain: 0.0 },
];

export const LOCAL_MEDIA: MediaItem[] = [
  { id: "md-001", title: "ใบงานเศษส่วนเท่ากัน ชั้น ป.5", type: "ใบงาน", subject: "คณิตศาสตร์", grade: "ป.5", downloads: 42 },
  { id: "md-002", title: "สไลด์สอนวัฏจักรน้ำ ป.4", type: "สไลด์", subject: "วิทยาศาสตร์", grade: "ป.4", downloads: 35 },
  { id: "md-003", title: "วิดีโอการอ่านจับใจความสำคัญ (10 นาที)", type: "วิดีโอ", subject: "ภาษาไทย", grade: "ป.4", downloads: 28 },
  { id: "md-004", title: "แบบทดสอบท้ายบท สมการเชิงเส้น ม.1", type: "แบบทดสอบ", subject: "คณิตศาสตร์", grade: "ม.1", downloads: 21 },
  { id: "md-005", title: "ใบงานคำศัพท์ภาษาอังกฤษหมวดอาหาร", type: "ใบงาน", subject: "ภาษาอังกฤษ", grade: "ม.1", downloads: 19 },
  { id: "md-006", title: "สไลด์ประวัติศาสตร์อยุธยาโดยย่อ", type: "สไลด์", subject: "สังคมศึกษา", grade: "ป.5", downloads: 16 },
  { id: "md-007", title: "แบบทดสอบอักษรนำ อักษรควบ", type: "แบบทดสอบ", subject: "ภาษาไทย", grade: "ป.4", downloads: 24 },
  { id: "md-008", title: "วิดีโอสาธิตการทดลองแม่เหล็ก (3 นาที)", type: "วิดีโอ", subject: "วิทยาศาสตร์", grade: "ป.5", downloads: 12 },
];

const EMPTY_TIMETABLE: Timetable = { days: [], periods: [], grid: {} };
const EMPTY_EXAM: ExamRunner = { id: "", title: "", subject: "", questions: [], answerKey: [], totalQuestions: 0 };
const EMPTY_PLC: PlcFeed = { posts: [] };

export async function fetchTimetable(): Promise<Timetable> {
  try {
    const res = await fetch(`${API_URL}/api/demo/timetable`, {
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) throw new Error(`backend ${res.status}`);
    return (await res.json()) as Timetable;
  } catch {
    if (!DEMO_MODE) return EMPTY_TIMETABLE;
    return LOCAL_TIMETABLE;
  }
}

export async function fetchHomework(): Promise<Homework[]> {
  try {
    const res = await fetch(`${API_URL}/api/demo/homework`, {
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) throw new Error(`backend ${res.status}`);
    return (await res.json()) as Homework[];
  } catch {
    if (!DEMO_MODE) return [];
    return LOCAL_HOMEWORK;
  }
}

export async function fetchExamRunner(): Promise<ExamRunner> {
  try {
    const res = await fetch(`${API_URL}/api/demo/exam-runner`, {
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) throw new Error(`backend ${res.status}`);
    return (await res.json()) as ExamRunner;
  } catch {
    if (!DEMO_MODE) return EMPTY_EXAM;
    return LOCAL_EXAM_RUNNER;
  }
}

export async function fetchCurriculumMap(): Promise<CurriculumSubject[]> {
  try {
    const res = await fetch(`${API_URL}/api/demo/curriculum`, {
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) throw new Error(`backend ${res.status}`);
    return (await res.json()) as CurriculumSubject[];
  } catch {
    if (!DEMO_MODE) return [];
    return LOCAL_CURRICULUM;
  }
}

export async function fetchPlcFeed(): Promise<PlcFeed> {
  try {
    const res = await fetch(`${API_URL}/api/demo/plc`, {
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) throw new Error(`backend ${res.status}`);
    return (await res.json()) as PlcFeed;
  } catch {
    if (!DEMO_MODE) return EMPTY_PLC;
    return LOCAL_PLC_FEED;
  }
}

export async function fetchResearch(): Promise<ResearchProject[]> {
  try {
    const res = await fetch(`${API_URL}/api/demo/research`, {
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) throw new Error(`backend ${res.status}`);
    return (await res.json()) as ResearchProject[];
  } catch {
    if (!DEMO_MODE) return [];
    return LOCAL_RESEARCH;
  }
}

export async function fetchMediaLibrary(): Promise<MediaItem[]> {
  try {
    const res = await fetch(`${API_URL}/api/demo/media`, {
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) throw new Error(`backend ${res.status}`);
    return (await res.json()) as MediaItem[];
  } catch {
    if (!DEMO_MODE) return [];
    return LOCAL_MEDIA;
  }
}


