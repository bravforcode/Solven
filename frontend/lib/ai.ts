// AI demo features (ตรวจเรียงความ / สร้างสื่อ / ประเมินการอ่าน / วิเคราะห์พฤติกรรม /
// ผู้ช่วยผู้บริหาร / AI ติวเตอร์) — deterministic demo data mirroring
// backend /api/demo/essay-grade, /api/demo/media-generate, /api/demo/reading,
// /api/demo/behavior, /api/demo/principal, /api/demo/tutor-reply.

export interface EssayDimension {
  name: string;
  score: number;
  max: number;
  comment: string;
}

export interface EssayGradeResult {
  dims: EssayDimension[];
  totalScore: number;
  totalMax: number;
  grade: "ดีเยี่ยม" | "ดี" | "พอใช้" | "ปรับปรุง";
  suggestions: string[];
}

export interface MediaSlide {
  title: string;
  bullets: string[];
}

export interface MediaResult {
  topic: string;
  slides: MediaSlide[];
  script: string;
  suggestedImages: string[];
}

export interface ReadingRecord {
  studentId: string;
  name: string;
  date: string;
  wpm: number;
  accuracyPct: number;
  fluency: "คล่อง" | "ปานกลาง" | "ต้องฝึก";
  errors: number;
}

export interface ReadingResult {
  records: ReadingRecord[];
}

export interface BehaviorStudent {
  id: string;
  name: string;
  trend: "ดีขึ้น" | "ทรงตัว" | "แย่ลง";
  attendancePct: number;
  gradeTrend: string;
  flags: string[];
  summary: string;
}

export interface BehaviorResult {
  students: BehaviorStudent[];
  insights: string[];
}

export interface PrincipalSummary {
  enrollment: number;
  avgGpa: number;
  attendancePct: number;
  budgetUsedPct: number;
  staffCount: number;
}

export interface PrincipalInsight {
  type: "จุดแข็ง" | "จุดเสี่ยง" | "ข้อเสนอแนะ";
  text: string;
}

export interface PrincipalResult {
  summary: PrincipalSummary;
  insights: PrincipalInsight[];
  alerts: string[];
}

export interface TutorReply {
  question: string;
  subject: string;
  reply: string;
  relatedTopic: string;
  practiceQuestion: string;
}

const API_URL =
  process.env.SOLVEN_BACKEND_URL ??
  process.env.NEXT_PUBLIC_SOLVEN_API_URL ??
  "http://localhost:8000";

const DEMO_MODE = process.env.NEXT_PUBLIC_SOLVEN_MODE === "demo";

// ---------------------------------------------------------------------------
// Local mirrors (deterministic, identical to backend generators)
// ---------------------------------------------------------------------------

function gradeEssayLocal(text: string): EssayGradeResult {
  const raw = (text ?? "").trim();
  const length = raw.length;
  const words = raw.match(/[ก-๙]{2,}/g) ?? [];
  const distinct = new Set(words).size;
  const hasParagraphs = raw.includes("\n\n") || (raw.match(/\n/g) ?? []).length >= 2;
  const hasMarkers = ["1)", "2)", "3)", "ประการแรก", "สุดท้าย"].some((m) => raw.includes(m));

  const content = length >= 150 ? 8 : length >= 60 ? 5 : 3;
  const language = distinct >= 25 ? 8 : distinct >= 12 ? 6 : 4;
  const structure = hasParagraphs && hasMarkers ? 9 : hasParagraphs || hasMarkers ? 7 : 4;
  const creativity = distinct >= 30 && length >= 150 ? 7 : distinct >= 15 ? 6 : 4;

  const dims: EssayDimension[] = [
    {
      name: "เนื้อหา",
      score: content,
      max: 10,
      comment:
        content >= 7
          ? "เนื้อหาครบถ้วน เขียนตรงประเด็นที่กำหนด"
          : content >= 5
            ? "มีประเด็นหลักแต่ยังขยายความไม่มากพอ"
            : "เนื้อหายังสั้น ควรเพิ่มรายละเอียดและตัวอย่าง",
    },
    {
      name: "ภาษา",
      score: language,
      max: 10,
      comment:
        language >= 7
          ? "ใช้คำหลากหลาย ถูกต้องตามหลักภาษา"
          : language >= 5
            ? "ภาษาโดยรวมใช้ได้ ควรเพิ่มคำเชื่อมและคำศัพท์"
            : "ควรฝึกใช้คำให้ถูกต้องและหลากหลายขึ้น",
    },
    {
      name: "โครงสร้าง",
      score: structure,
      max: 10,
      comment:
        structure >= 7
          ? "จัดย่อหน้าชัดเจน มีลำดับการนำเสนอ"
          : structure >= 5
            ? "ควรจัดย่อหน้าและลำดับเนื้อหาให้ชัดเจนขึ้น"
            : "ยังไม่พบการแบ่งย่อหน้า ควรฝึกวางโครงสร้างเรื่อง",
    },
    {
      name: "ความคิดสร้างสรรค์",
      score: creativity,
      max: 10,
      comment:
        creativity >= 7
          ? "มีแนวคิดน่าสนใจ ใช้ภาษาเพื่อสื่ออารมณ์ได้ดี"
          : creativity >= 5
            ? "มีความคิดสร้างสรรค์พอควร ต่อยอดได้อีก"
            : "ควรลองเพิ่มมุมมองใหม่ๆ ในการเขียน",
    },
  ];

  const totalScore = dims.reduce((s, d) => s + d.score, 0);
  const grade: EssayGradeResult["grade"] =
    totalScore >= 34 ? "ดีเยี่ยม" : totalScore >= 26 ? "ดี" : totalScore >= 18 ? "พอใช้" : "ปรับปรุง";

  const suggestions: string[] = [];
  const weak = dims.filter((d) => d.score < 5).map((d) => d.name);
  if (weak.length > 0) suggestions.push(`ควรฝึกด้าน${weak.join(" ")}: ลองเขียนวันละ 5-10 ประโยค`);
  if (length < 150) suggestions.push("ขยายความแต่ละย่อหน้าให้ละเอียดขึ้น (แนะนำอย่างน้อย 150 ตัวอักษร)");
  if (!hasParagraphs) suggestions.push("แบ่งย่อหน้าเป็น 3 ส่วน: นำเรื่อง - เนื้อเรื่อง - สรุป");
  if (distinct < 25) suggestions.push("เพิ่มคำศัพท์และคำเชื่อมเพื่อให้ภาษาไหลลื่นขึ้น");
  if (suggestions.length === 0) suggestions.push("ผลงานดีมาก ลองเขียนหัวข้อที่ท้าทายขึ้นในครั้งหน้า");

  return { dims, totalScore, totalMax: 40, grade, suggestions };
}

function generateMediaLocal(topic: string): MediaResult {
  const t = (topic ?? "").trim() || "การเรียนรู้";
  return {
    topic: t,
    slides: [
      {
        title: `บทนำ: ${t}`,
        bullets: ["เกริ่นนำด้วยคำถามชวนคิด", "บอกวัตถุประสงค์การเรียนรู้", "เชื่อมโยงกับประสบการณ์ของนักเรียน"],
      },
      {
        title: `เนื้อหาหลัก: ${t}`,
        bullets: ["แนวคิดสำคัญของเนื้อหา", "ตัวอย่างประกอบ 2-3 ตัวอย่าง", "คำศัพท์หรือสูตรที่ต้องจำ"],
      },
      {
        title: "กิจกรรมในชั้นเรียน",
        bullets: ["เกมหรือแบบฝึกหัดกลุ่ม", "คำถามให้อภิปรายร่วมกัน", "ใบงานท้ายชั่วโมง"],
      },
      {
        title: "สรุปบทเรียน",
        bullets: ["สรุปประเด็นสำคัญ 3 ข้อ", "ตรวจสอบความเข้าใจด้วยคำถามสั้นๆ", "การบ้านและแหล่งเรียนรู้เพิ่มเติม"],
      },
    ],
    script:
      `สไลด์ 1 — เปิดชั่วโมงด้วยคำถาม: "นักเรียนเคยเจอเรื่อง ${t} ที่ไหนบ้าง?" เพื่อดึงความสนใจก่อนเข้าสู่เนื้อหา\n` +
      `สไลด์ 2 — อธิบายแนวคิดหลักของ ${t} พร้อมยกตัวอย่างใกล้ตัวนักเรียน\n` +
      "สไลด์ 3 — ให้ทำกิจกรรมกลุ่ม 5 นาที แล้วเฉลยร่วมกันทั้งห้อง\n" +
      "สไลด์ 4 — สรุป 3 ประเด็นสำคัญ และมอบการบ้านท้ายชั่วโมง",
    suggestedImages: [
      `ภาพประกอบหัวข้อ ${t} สไตล์การ์ตูนการศึกษา สีสันสดใส`,
      "ภาพนักเรียนกลุ่มเล็กกำลังเรียนรู้ร่วมกัน",
      "ภาพไอคอนอินโฟกราฟิกสำหรับสรุปบทเรียน",
    ],
  };
}

export const LOCAL_READING: ReadingRecord[] = [
  { studentId: "s-001", name: "เด็กชายสมชาย ใจดี", date: "2026-08-10", wpm: 92, accuracyPct: 94, fluency: "ปานกลาง", errors: 6 },
  { studentId: "s-002", name: "เด็กหญิงสมหญิง รักเรียน", date: "2026-08-10", wpm: 128, accuracyPct: 98, fluency: "คล่อง", errors: 2 },
  { studentId: "s-003", name: "เด็กชายอนุชา แซ่ลี้", date: "2026-08-11", wpm: 58, accuracyPct: 86, fluency: "ต้องฝึก", errors: 14 },
  { studentId: "s-004", name: "เด็กหญิงพิมพ์ชนก ศรีสุข", date: "2026-08-11", wpm: 135, accuracyPct: 99, fluency: "คล่อง", errors: 1 },
  { studentId: "s-005", name: "เด็กชายธนกร วงษ์คำ", date: "2026-08-12", wpm: 75, accuracyPct: 91, fluency: "ปานกลาง", errors: 9 },
];

export const LOCAL_BEHAVIOR: BehaviorResult = {
  students: [
    { id: "s-001", name: "เด็กชายสมชาย ใจดี", trend: "ดีขึ้น", attendancePct: 96, gradeTrend: "คะแนนสอบล่าสุดสูงขึ้น 1 ระดับ", flags: ["ส่งงานตรงเวลาเพิ่มขึ้น"], summary: "ตั้งใจเรียนมากขึ้นในวิชาคณิตศาสตร์" },
    { id: "s-002", name: "เด็กหญิงสมหญิง รักเรียน", trend: "ทรงตัว", attendancePct: 98, gradeTrend: "ผลการเรียนคงที่ระดับดีมาก", flags: [], summary: "มีสมาธิดี มักช่วยเหลือเพื่อนในห้อง" },
    { id: "s-003", name: "เด็กชายอนุชา แซ่ลี้", trend: "แย่ลง", attendancePct: 82, gradeTrend: "คะแนนลดลง 2 ระดับในช่วง 2 เดือน", flags: ["ขาดเรียนบ่อย", "ไม่ส่งการบ้าน 3 ครั้ง"], summary: "ควรพบครูที่ปรึกษาและติดต่อผู้ปกครอง" },
    { id: "s-004", name: "เด็กหญิงพิมพ์ชนก ศรีสุข", trend: "ดีขึ้น", attendancePct: 100, gradeTrend: "คะแนนสูงขึ้นต่อเนื่อง 3 ครั้ง", flags: ["เข้าร่วมกิจกรรมชมรม"], summary: "พัฒนาการดีมาก สนับสนุนให้แข่งขันวิชาการ" },
    { id: "s-005", name: "เด็กชายธนกร วงษ์คำ", trend: "ทรงตัว", attendancePct: 93, gradeTrend: "ผลการเรียนคงที่ระดับปานกลาง", flags: ["คุยในชั่วโมงเรียนบ้าง"], summary: "จัดที่นั่งใกล้ครูและมอบบทบาทผู้นำกลุ่ม" },
  ],
  insights: [
    "นักเรียน 2 ใน 5 คนมีแนวโน้มดีขึ้น — สานต่อกิจกรรมที่ได้ผล",
    "นักเรียน 1 คนมีแนวโน้มแย่ลง (ขาดเรียน + ไม่ส่งงาน) — ควรประชุมผู้ปกครองภายในสัปดาห์นี้",
    "อัตราการมาเรียนเฉลี่ย 93.8% — สูงกว่าเกณฑ์ขั้นต่ำของโรงเรียน (90%)",
  ],
};

export const LOCAL_PRINCIPAL: PrincipalResult = {
  summary: { enrollment: 452, avgGpa: 3.24, attendancePct: 93.8, budgetUsedPct: 67, staffCount: 38 },
  insights: [
    { type: "จุดแข็ง", text: "อัตราการมาเรียนเฉลี่ย 93.8% สูงกว่าเป้าหมายของโรงเรียน" },
    { type: "จุดแข็ง", text: "ผลการเรียนเฉลี่ย GPA 3.24 เพิ่มขึ้นจากภาคเรียนก่อน 0.08" },
    { type: "จุดเสี่ยง", text: "นักเรียนชั้น ม.1 มีอัตราขาดเรียนสูงสุด (9.5%) — ควรติดตามรายบุคคล" },
    { type: "จุดเสี่ยง", text: "งบประมาณใช้ไปแล้ว 67% ในเดือนที่ 8 — เหลือ 33% สำหรับ 4 เดือนสุดท้าย" },
    { type: "ข้อเสนอแนะ", text: "จัดโครงการซ่อมเสริมคณิตศาสตร์สำหรับนักเรียนที่คะแนนต่ำกว่าเกณฑ์ 15 คน" },
    { type: "ข้อเสนอแนะ", text: "อบรมครูเรื่องการวิเคราะห์ข้อมูลผลการเรียนรายห้อง 2 ครั้งต่อภาคเรียน" },
  ],
  alerts: [
    "นักเรียน 3 คนเสี่ยงไม่จบการศึกษาในปีนี้ (คะแนนต่ำ + ขาดเรียนซ้ำ)",
    "ห้องน้ำอาคาร 2 ขัดข้อง 2 วัน — แจ้งงานอาคารสถานที่แล้ว",
    "ยังไม่ส่งรายงานผลการเรียนภาคเรียนที่ 1 จำนวน 2 ห้อง",
  ],
};

interface TutorRule {
  keywords: string;
  reply: string;
  topic: string;
  practice: string;
}

const LOCAL_TUTOR_RULES: Record<string, TutorRule[]> = {
  คณิตศาสตร์: [
    { keywords: "เศษส่วน", reply: "เศษส่วนคือการแบ่งสิ่งของออกเป็นส่วนเท่าๆ กัน เช่น 1/2 คือ 1 ส่วนจากทั้งหมด 2 ส่วนเท่าๆ กัน ลองนึกภาพพิซซ่า 1 ถาดแบ่งเป็น 8 ชิ้น เรากิน 3 ชิ้น ก็คือ 3/8 ของถาด", topic: "เศษส่วนเบื้องต้น", practice: "จงหาค่า 2/5 + 1/5 และเขียนคำตอบเป็นเศษส่วนอย่างต่ำ" },
    { keywords: "บวก", reply: "การบวกคือการรวมจำนวนเข้าด้วยกัน เช่น 25 + 17 = 42 ลองแยกเป็น 25 + 10 + 7 = 42 จะคิดง่ายขึ้น", topic: "การบวกเลข", practice: "จงหาค่า 47 + 36 (ลองแยกหลักสิบกับหลักหน่วยก่อนบวก)" },
    { keywords: "พื้นที่", reply: "พื้นที่สามเหลี่ยม = (ฐาน x สูง) / 2 เช่น ฐาน 8 ซม. สูง 5 ซม. จะได้ (8 x 5) / 2 = 20 ตร.ซม.", topic: "การหาพื้นที่", practice: "สามเหลี่ยมฐาน 10 ซม. สูง 6 ซม. มีพื้นที่เท่าไร" },
  ],
  วิทยาศาสตร์: [
    { keywords: "น้ำ", reply: "น้ำในธรรมชาติหมุนเวียนเป็นวัฏจักร: ระเหยเป็นไอ -> ควบแน่นเป็นเมฆ -> ตกเป็นฝน -> ไหลลงสู่แหล่งน้ำ แล้วระเหยซ้ำอีกครั้ง", topic: "วัฏจักรน้ำ", practice: "จงเรียงลำดับวัฏจักรน้ำ 4 ขั้นตอนพร้อมยกตัวอย่าง" },
    { keywords: "พืช", reply: "พืชหายใจด้วยปากใบ (stomata) ที่อยู่ใต้ใบ แลกเปลี่ยนแก๊สออกซิเจนและคาร์บอนไดออกไซด์ ส่วนรากดูดน้ำและแร่ธาตุขึ้นไปเลี้ยงลำต้นและใบ", topic: "โครงสร้างพืช", practice: "อวัยวะใดของพืชทำหน้าที่ดูดน้ำและแร่ธาตุ" },
    { keywords: "แรง", reply: "แรงคือการผลักหรือดึงที่ทำให้วัตถุเคลื่อนที่ เปลี่ยนทิศทาง หรือเปลี่ยนรูปร่าง หน่วยวัดคือ นิวตัน (N)", topic: "แรงและการเคลื่อนที่", practice: "ยกตัวอย่างแรงผลักและแรงดึงอย่างละ 1 อย่างในชีวิตประจำวัน" },
  ],
  ภาษาไทย: [
    { keywords: "อ่าน", reply: "การอ่านจับใจความสำคัญ เริ่มจากอ่านรอบแรกให้เข้าใจโดยรวม แล้วหาประโยคหลักของแต่ละย่อหน้า ใช้ดินสอขีดใต้คำสำคัญ แล้วสรุปด้วยภาษาของตนเอง", topic: "การอ่านจับใจความ", practice: "อ่านเรื่องสั้น 1 เรื่อง แล้วเขียนใจความสำคัญ 1-2 ประโยค" },
    { keywords: "คำ", reply: "คำที่มีความหมายตรงข้าม (คำตรงข้าม) เช่น สว่าง-มืด ใหญ่-เล็ก เร็ว-ช้า ใช้ช่วยให้ภาษาเปรียบเทียบได้ชัดเจนขึ้น", topic: "คำตรงข้าม", practice: "หาคำตรงข้ามของ: ร้อน, สูง, ดี, ใหม่" },
  ],
  สังคมศึกษา: [
    { keywords: "แม่น้ำ", reply: "แม่น้ำเจ้าพระยาเป็นแม่น้ำสายสำคัญของไทย ไหลจากภาคเหนือลงสู่อ่าวไทย ผ่านกรุงเทพฯ เป็นเส้นทางคมนาคมและแหล่งน้ำเพื่อการเกษตร", topic: "ภูมิศาสตร์ไทย", practice: "แม่น้ำเจ้าพระยาไหลลงสู่ทะเลใด" },
    { keywords: "ประชาธิปไตย", reply: "ประชาธิปไตยคือการปกครองโดยประชาชน ผ่านการเลือกตั้งผู้แทน เพื่อร่วมตัดสินใจเรื่องส่วนรวม และเคารพสิทธิเสียงข้างมากพร้อมดูแลเสียงข้างน้อย", topic: "การปกครอง", practice: "การเลือกตั้งมีความสำคัญต่อสังคมประชาธิปไตยอย่างไร" },
  ],
};

function tutorReplyLocal(question: string, subject: string): TutorReply {
  const q = (question ?? "").trim();
  const subj = (subject ?? "คณิตศาสตร์").trim() || "คณิตศาสตร์";
  const rules = LOCAL_TUTOR_RULES[subj] ?? LOCAL_TUTOR_RULES["คณิตศาสตร์"];
  const hit = rules.find((r) => r.keywords.split(" ").some((k) => q.includes(k)));
  if (hit) {
    return { question: q, subject: subj, reply: hit.reply, relatedTopic: hit.topic, practiceQuestion: hit.practice };
  }
  return {
    question: q,
    subject: subj,
    reply: "ขอบคุณสำหรับคำถาม! ในโหมดสาธิต ฉันตอบจากคลังคำตอบสำเร็จรูป ลองถามหัวข้อที่ระบุไว้ในชิปวิชาเพื่อดูตัวอย่างคำตอบ",
    relatedTopic: "หัวข้อทั่วไป",
    practiceQuestion: "ทบทวนเนื้อหาในบทเรียนล่าสุด แล้วลองทำแบบฝึกหัดท้ายบทด้วยตัวเอง",
  };
}

// ---------------------------------------------------------------------------
// Fetch functions (backend first, local fallback in demo mode)
// ---------------------------------------------------------------------------

export async function essayGrade(text: string): Promise<EssayGradeResult> {
  try {
    const res = await fetch(`${API_URL}/api/demo/essay-grade`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal: AbortSignal.timeout(8000),
      body: JSON.stringify({ text }),
    });
    if (!res.ok) throw new Error(`backend ${res.status}`);
    return (await res.json()) as EssayGradeResult;
  } catch {
    if (!DEMO_MODE) throw new Error("backend unreachable");
    return gradeEssayLocal(text);
  }
}

export async function generateMedia(topic: string): Promise<MediaResult> {
  try {
    const res = await fetch(`${API_URL}/api/demo/media-generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal: AbortSignal.timeout(8000),
      body: JSON.stringify({ topic }),
    });
    if (!res.ok) throw new Error(`backend ${res.status}`);
    return (await res.json()) as MediaResult;
  } catch {
    if (!DEMO_MODE) throw new Error("backend unreachable");
    return generateMediaLocal(topic);
  }
}

export async function fetchReading(): Promise<ReadingRecord[]> {
  try {
    const res = await fetch(`${API_URL}/api/demo/reading`, {
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) throw new Error(`backend ${res.status}`);
    const data = (await res.json()) as ReadingResult;
    return data.records ?? [];
  } catch {
    if (!DEMO_MODE) return [];
    return LOCAL_READING;
  }
}

export async function fetchBehavior(): Promise<BehaviorResult> {
  try {
    const res = await fetch(`${API_URL}/api/demo/behavior`, {
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) throw new Error(`backend ${res.status}`);
    return (await res.json()) as BehaviorResult;
  } catch {
    if (!DEMO_MODE) throw new Error("backend unreachable");
    return LOCAL_BEHAVIOR;
  }
}

export async function fetchPrincipal(): Promise<PrincipalResult> {
  try {
    const res = await fetch(`${API_URL}/api/demo/principal`, {
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) throw new Error(`backend ${res.status}`);
    return (await res.json()) as PrincipalResult;
  } catch {
    if (!DEMO_MODE) throw new Error("backend unreachable");
    return LOCAL_PRINCIPAL;
  }
}

export async function tutorReply(question: string, subject: string): Promise<TutorReply> {
  try {
    const res = await fetch(`${API_URL}/api/demo/tutor-reply`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal: AbortSignal.timeout(8000),
      body: JSON.stringify({ question, subject }),
    });
    if (!res.ok) throw new Error(`backend ${res.status}`);
    return (await res.json()) as TutorReply;
  } catch {
    if (!DEMO_MODE) throw new Error("backend unreachable");
    return tutorReplyLocal(question, subject);
  }
}
