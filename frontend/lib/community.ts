// Mock community hub (เครือข่าย ตลาดสื่อ ประกาศ กิจกรรม กีฬาสี การจอง
// แบบสำรวจ เกมมิฟิเคชัน สถานะระบบ) — deterministic demo data.
// Tries the backend /api/demo/* endpoints first; falls back to the local
// mirrors when the backend is unreachable (demo mode only).

export interface NetworkMember {
  id: string;
  name: string;
  district: string;
  students: number;
  teachers: number;
  sharedResources: string[];
  joined: string;
}

export interface NetworkEvent {
  id: string;
  title: string;
  date: string;
  host: string;
  topic: string;
}

export interface SchoolNetwork {
  members: NetworkMember[];
  events: NetworkEvent[];
}

export interface MarketItem {
  id: string;
  title: string;
  type: string;
  author: string;
  downloads: number;
  rating: number;
  price: string;
}

export interface MarketplaceData {
  items: MarketItem[];
}

export interface NewsItem {
  id: string;
  title: string;
  category: string;
  date: string;
  body: string;
  pinned: boolean;
}

export interface NewsFeed {
  items: NewsItem[];
}

export interface Club {
  id: string;
  name: string;
  advisor: string;
  members: number;
  schedule: string;
}

export interface ClubActivity {
  id: string;
  clubId: string;
  date: string;
  hours: number;
  description: string;
}

export interface ClubData {
  clubs: Club[];
  activities: ClubActivity[];
}

export interface SportsTeam {
  id: string;
  name: string;
  score: number;
}

export interface SportsEvent {
  id: string;
  sport: string;
  teams: string;
  result: string;
  date: string;
}

export interface SportsData {
  teams: SportsTeam[];
  events: SportsEvent[];
}

export interface Room {
  id: string;
  name: string;
  capacity: number;
  equipment: string[];
}

export interface Booking {
  id: string;
  item: string;
  booker: string;
  date: string;
  time: string;
  purpose: string;
  status: string;
}

export interface BookingsData {
  rooms: Room[];
  bookings: Booking[];
}

export interface SurveyQuestion {
  q: string;
  type: string;
}

export interface Survey {
  id: string;
  title: string;
  questions: SurveyQuestion[];
  responsesCount: number;
  avgScore: number;
}

export interface SurveysData {
  surveys: Survey[];
}

export interface Badge {
  name: string;
  icon: string;
  earned: boolean;
}

export interface BadgeStudent {
  id: string;
  name: string;
  points: number;
  badges: Badge[];
}

export interface LeaderboardRow {
  rank: number;
  id: string;
  name: string;
  points: number;
  badges: Badge[];
}

export interface BadgesData {
  students: BadgeStudent[];
  leaderboard: LeaderboardRow[];
}

export interface SystemCheck {
  name: string;
  ok: boolean;
  detail: string;
}

export interface SystemStatus {
  checks: SystemCheck[];
  uptimeDays: number;
  version: string;
}

const API_URL =
  process.env.SOLVEN_BACKEND_URL ??
  process.env.NEXT_PUBLIC_SOLVEN_API_URL ??
  "http://localhost:8000";

const DEMO_MODE = process.env.NEXT_PUBLIC_SOLVEN_MODE === "demo";

export const LOCAL_NETWORK: SchoolNetwork = {
  members: [
    { id: "sch-001", name: "โรงเรียนบ้านสวนฝั่งสุข", district: "เมือง", students: 320, teachers: 24, sharedResources: ["ชุดทดลองวิทยาศาสตร์", "แบบฝึกคณิตศาสตร์ ป.4-6"], joined: "2563" },
    { id: "sch-002", name: "โรงเรียนวัดคลองใหม่", district: "คลองหลวง", students: 210, teachers: 16, sharedResources: ["ห้องสมุดเคลื่อนที่", "สื่อภาษาไทยเสียง"], joined: "2563" },
    { id: "sch-003", name: "โรงเรียนชุมชนบ้านทุ่งนา", district: "ธัญบุรี", students: 450, teachers: 32, sharedResources: ["สนามกีฬาเอนกประสงค์", "ชุดคอมพิวเตอร์ 20 เครื่อง"], joined: "2564" },
    { id: "sch-004", name: "โรงเรียนบ้านหนองบัว", district: "ลำลูกกา", students: 150, teachers: 12, sharedResources: ["สวนเกษตรเรียนรู้", "เตาอบเบเกอรี่"], joined: "2565" },
    { id: "sch-005", name: "โรงเรียนวัดสระแก้ว", district: "สามโคก", students: 280, teachers: 20, sharedResources: ["วงดนตรีไทย", "ชุดกีฬาสี"], joined: "2565" },
  ],
  events: [
    { id: "evt-001", title: "ประชุมเครือข่ายพัฒนาครูภาษาไทย", date: "17 ส.ค. 2569", host: "โรงเรียนบ้านสวนฝั่งสุข", topic: "การอ่านจับใจความ ป.4" },
    { id: "evt-002", title: "อบรมการใช้ AI ช่วยวางแผนการสอน", date: "24 ส.ค. 2569", host: "โรงเรียนชุมชนบ้านทุ่งนา", topic: "AI เพื่อการศึกษา" },
    { id: "evt-003", title: "แข่งขันทักษะวิชาการกลุ่มสาระวิทย์", date: "5 ก.ย. 2569", host: "โรงเรียนวัดคลองใหม่", topic: "โครงงานวิทยาศาสตร์" },
    { id: "evt-004", title: "แลกเปลี่ยนเรียนรู้ครูคณิตศาสตร์", date: "12 ก.ย. 2569", host: "โรงเรียนวัดสระแก้ว", topic: "การสอนเศษส่วนด้วยสื่อจริง" },
  ],
};

export const LOCAL_MARKETPLACE: MarketplaceData = {
  items: [
    { id: "m-001", title: "บัตรภาพคำศัพท์ภาษาอังกฤษ ป.1-3", type: "สื่อภาพ", author: "ครูสมหญิง ใจดี", downloads: 1240, rating: 4.8, price: "ฟรี" },
    { id: "m-002", title: "ชุดแบบฝึกคิดเลขเร็ว ป.4", type: "แบบฝึกหัด", author: "ครูประเสริฐ สุขสันต์", downloads: 860, rating: 4.5, price: "ฟรี" },
    { id: "m-003", title: "เกมจับคู่เศษส่วน (พิมพ์ได้)", type: "เกม", author: "ครูอนงค์ แก้วใส", downloads: 540, rating: 4.6, price: "30 บาท" },
    { id: "m-004", title: "แผนผังวัฏจักรน้ำ ป.4", type: "แผนผัง", author: "ครูสุชาติ พรมมา", downloads: 720, rating: 4.3, price: "ฟรี" },
    { id: "m-005", title: "ไฟล์นำเสนอประชุมผู้ปกครอง", type: "เทมเพลต", author: "ครูมณีรัตน์ สุขสันต์", downloads: 410, rating: 4.7, price: "ฟรี" },
    { id: "m-006", title: "คลิปสอนการบ้านคณิต ม.1 (10 ตอน)", type: "วิดีโอ", author: "ครูกิตติพงษ์ แก้วใส", downloads: 950, rating: 4.9, price: "120 บาท" },
  ],
};

export const LOCAL_NEWS: NewsFeed = {
  items: [
    { id: "n-001", title: "ประกาศหยุดเรียนพิเศษ 1 วัน วันที่ 21 ส.ค. 2569", category: "ข่าวด่วน", date: "16 ส.ค. 2569", body: "ด้วยเหตุจำเป็นทางโรงเรียนประกาศหยุดเรียน 1 วัน ขอให้นักเรียนทำการบ้านที่ได้รับมอบหมายกลับไปฝึกที่บ้าน", pinned: true },
    { id: "n-002", title: "รับสมัครนักเรียนใหม่ ปีการศึกษา 2570", category: "ประชาสัมพันธ์", date: "15 ส.ค. 2569", body: "เปิดรับสมัครนักเรียนชั้น ป.1 และ ม.1 ระหว่างวันที่ 1-30 ก.ย. นี้ ติดต่อห้องธุรการ", pinned: false },
    { id: "n-003", title: "กิจกรรมวันวิทยาศาสตร์แห่งชาติ", category: "กิจกรรม", date: "14 ส.ค. 2569", body: "จัดกิจกรรมการประกวดโครงงานวิทยาศาสตร์ระดับโรงเรียน วันที่ 18 ส.ค. ณ หอประชุมใหญ่", pinned: false },
    { id: "n-004", title: "อบรมครู: การใช้สื่อดิจิทัลในชั้นเรียน", category: "วิชาการ", date: "12 ส.ค. 2569", body: "ครูทุกท่านโปรดลงทะเบียนเข้าร่วมอบรมผ่านระบบภายในวันที่ 20 ส.ค.", pinned: false },
    { id: "n-005", title: "แจ้งวันปิดภาคเรียนและรับผลการเรียน", category: "ประชาสัมพันธ์", date: "10 ส.ค. 2569", body: "วันปิดภาคเรียนที่ 1: 30 ก.ย. 2569 ผู้ปกครองรับสมุดพกได้ตั้งแต่วันที่ 29 ก.ย.", pinned: false },
  ],
};

export const LOCAL_CLUBS: ClubData = {
  clubs: [
    { id: "club-001", name: "ชมรมดนตรีไทย", advisor: "ครูสมหญิง ใจดี", members: 25, schedule: "ทุกวันพุธ 13:00-14:30" },
    { id: "club-002", name: "ชมรมวิทยาศาสตร์", advisor: "ครูสุชาติ พรมมา", members: 30, schedule: "ทุกวันพฤหัสบดี 13:00-14:30" },
    { id: "club-003", name: "ชมรมกีฬาฟุตบอล", advisor: "ครูประเสริฐ สุขสันต์", members: 28, schedule: "ทุกวันอังคารและศุกร์ 15:30-17:00" },
    { id: "club-004", name: "ชมรมวาดภาพ", advisor: "ครูอนงค์ แก้วใส", members: 18, schedule: "ทุกวันจันทร์ 13:00-14:30" },
  ],
  activities: [
    { id: "act-001", clubId: "club-001", date: "12 ส.ค. 2569", hours: 1.5, description: "ซ้อมวงปี่พาทย์เตรียมงานวันวิทยาศาสตร์" },
    { id: "act-002", clubId: "club-002", date: "13 ส.ค. 2569", hours: 1.5, description: "ทดลองเรื่องวัฏจักรน้ำด้วยชุดทดลอง" },
    { id: "act-003", clubId: "club-003", date: "14 ส.ค. 2569", hours: 2.0, description: "ซ้อมแข่งขันฟุตบอลกระชับมิตรระหว่างชมรม" },
    { id: "act-004", clubId: "club-004", date: "14 ส.ค. 2569", hours: 1.5, description: "วาดภาพระบายสีหัวข้อวันแม่" },
    { id: "act-005", clubId: "club-002", date: "15 ส.ค. 2569", hours: 1.0, description: "จัดบอร์ดนิทรรศการโครงงาน" },
  ],
};

export const LOCAL_SPORTS: SportsData = {
  teams: [
    { id: "team-red", name: "คณะสีแดง", score: 128 },
    { id: "team-yellow", name: "คณะสีเหลือง", score: 142 },
    { id: "team-green", name: "คณะสีเขียว", score: 115 },
    { id: "team-blue", name: "คณะสีน้ำเงิน", score: 136 },
  ],
  events: [
    { id: "sp-001", sport: "วิ่ง 100 เมตร (ชาย)", teams: "แดง vs เหลือง", result: "เหลืองชนะ", date: "16 ส.ค. 2569" },
    { id: "sp-002", sport: "วิ่งผลัด 4x100 (หญิง)", teams: "เขียว vs น้ำเงิน", result: "น้ำเงินชนะ", date: "16 ส.ค. 2569" },
    { id: "sp-003", sport: "กระโดดไกล (ชาย)", teams: "ทุกคณะ", result: "แดงชนะ", date: "17 ส.ค. 2569" },
    { id: "sp-004", sport: "ฟุตบอลชิงชนะเลิศ", teams: "เหลือง vs น้ำเงิน", result: "รอแข่งขัน", date: "18 ส.ค. 2569" },
    { id: "sp-005", sport: "เชียร์ลีดเดอร์", teams: "ทุกคณะ", result: "รอแข่งวันที่ 19 ส.ค.", date: "19 ส.ค. 2569" },
  ],
};

export const LOCAL_BOOKINGS: BookingsData = {
  rooms: [
    { id: "room-001", name: "ห้องประชุมใหญ่", capacity: 80, equipment: ["โปรเจกเตอร์", "ไมโครโฟน", "จอ LED"] },
    { id: "room-002", name: "ห้องปฏิบัติการคอมพิวเตอร์", capacity: 40, equipment: ["คอมพิวเตอร์ 40 เครื่อง", "จอทีวี"] },
    { id: "room-003", name: "ห้องปฏิบัติการวิทยาศาสตร์", capacity: 35, equipment: ["ชุดทดลอง", "ตู้ดูดควัน"] },
    { id: "room-004", name: "ห้องดนตรี", capacity: 30, equipment: ["เครื่องดนตรีไทย", "ลำโพง"] },
  ],
  bookings: [
    { id: "bk-001", item: "ห้องประชุมใหญ่", booker: "ครูสมหญิง ใจดี", date: "17 ส.ค. 2569", time: "09:00-12:00", purpose: "ประชุมเครือข่ายภาษาไทย", status: "จองแล้ว" },
    { id: "bk-002", item: "ห้องปฏิบัติการคอมพิวเตอร์", booker: "ครูประเสริฐ สุขสันต์", date: "18 ส.ค. 2569", time: "13:00-15:00", purpose: "สอบออนไลน์คณิตศาสตร์", status: "จองแล้ว" },
    { id: "bk-003", item: "ห้องดนตรี", booker: "ครูสมหญิง ใจดี", date: "19 ส.ค. 2569", time: "13:00-14:30", purpose: "ซ้อมดนตรีไทย", status: "จองแล้ว" },
    { id: "bk-004", item: "ห้องปฏิบัติการวิทยาศาสตร์", booker: "ครูสุชาติ พรมมา", date: "20 ส.ค. 2569", time: "10:00-12:00", purpose: "กิจกรรมทดลอง ป.5", status: "ว่าง" },
  ],
};

export const LOCAL_SURVEYS: SurveysData = {
  surveys: [
    {
      id: "sv-001", title: "ความพึงพอใจการเรียนออนไลน์",
      questions: [
        { q: "เนื้อหาการเรียนออนไลน์เข้าใจง่ายเพียงใด", type: "5-point scale" },
        { q: "ข้อเสนอแนะเพิ่มเติมสำหรับการเรียนออนไลน์", type: "ข้อความ" },
      ],
      responsesCount: 58, avgScore: 4.2,
    },
    {
      id: "sv-002", title: "ความคิดเห็นเรื่องอาหารกลางวัน",
      questions: [
        { q: "คุณภาพอาหารกลางวันเป็นอย่างไร", type: "5-point scale" },
        { q: "เมนูที่อยากให้เพิ่ม", type: "ข้อความ" },
      ],
      responsesCount: 92, avgScore: 3.9,
    },
    {
      id: "sv-003", title: "ประเมินการประชุมผู้ปกครอง",
      questions: [
        { q: "เนื้อหาการประชุมเป็นประโยชน์เพียงใด", type: "5-point scale" },
        { q: "หัวข้อที่อยากให้จัดประชุมครั้งถัดไป", type: "ข้อความ" },
      ],
      responsesCount: 41, avgScore: 4.5,
    },
  ],
};

export const LOCAL_BADGES: BadgesData = {
  students: [
    {
      id: "s-010", name: "เด็กหญิงมณีรัตน์ สุขสันต์", points: 980,
      badges: [
        { name: "ดาวรุ่งแห่งเดือน", icon: "🏆", earned: true },
        { name: "ยอดนักอ่าน", icon: "📚", earned: true },
        { name: "ช่วยเหลือเพื่อน", icon: "🤝", earned: true },
      ],
    },
    {
      id: "s-004", name: "เด็กหญิงพิมพ์ชนก ศรีสุข", points: 910,
      badges: [
        { name: "ยอดนักอ่าน", icon: "📚", earned: true },
        { name: "ราชินีคณิต", icon: "🧮", earned: true },
      ],
    },
    {
      id: "s-006", name: "เด็กหญิงกนกพร ทองดี", points: 845,
      badges: [
        { name: "นักวิทยาศาสตร์น้อย", icon: "🔬", earned: true },
        { name: "ดาวรุ่งแห่งเดือน", icon: "🏆", earned: true },
      ],
    },
    {
      id: "s-012", name: "เด็กหญิงอรอุมา ใจบุญ", points: 780,
      badges: [{ name: "นักกีฬาตัวแทน", icon: "⚽", earned: true }],
    },
    {
      id: "s-001", name: "เด็กชายสมชาย ใจดี", points: 650,
      badges: [{ name: "ยอดนักอ่าน", icon: "📚", earned: true }],
    },
  ],
  leaderboard: [
    { rank: 1, id: "s-010", name: "เด็กหญิงมณีรัตน์ สุขสันต์", points: 980, badges: [{ name: "ดาวรุ่งแห่งเดือน", icon: "🏆", earned: true }, { name: "ยอดนักอ่าน", icon: "📚", earned: true }, { name: "ช่วยเหลือเพื่อน", icon: "🤝", earned: true }] },
    { rank: 2, id: "s-004", name: "เด็กหญิงพิมพ์ชนก ศรีสุข", points: 910, badges: [{ name: "ยอดนักอ่าน", icon: "📚", earned: true }, { name: "ราชินีคณิต", icon: "🧮", earned: true }] },
    { rank: 3, id: "s-006", name: "เด็กหญิงกนกพร ทองดี", points: 845, badges: [{ name: "นักวิทยาศาสตร์น้อย", icon: "🔬", earned: true }, { name: "ดาวรุ่งแห่งเดือน", icon: "🏆", earned: true }] },
    { rank: 4, id: "s-012", name: "เด็กหญิงอรอุมา ใจบุญ", points: 780, badges: [{ name: "นักกีฬาตัวแทน", icon: "⚽", earned: true }] },
    { rank: 5, id: "s-001", name: "เด็กชายสมชาย ใจดี", points: 650, badges: [{ name: "ยอดนักอ่าน", icon: "📚", earned: true }] },
  ],
};

export const LOCAL_STATUS: SystemStatus = {
  checks: [
    { name: "Backend", ok: true, detail: "ตอบสนองใน 120 ms" },
    { name: "โหมดสาธิต", ok: true, detail: "เปิดใช้งานข้อมูลตัวอย่าง (PDPA)" },
    { name: "ฐานข้อมูล", ok: true, detail: "เชื่อมต่อ SQLite ได้ (demo)" },
    { name: "การ์ดกันผิดพลาด", ok: true, detail: "ตรวจ PII/เบอร์โทร ในผลลัพธ์ AI" },
    { name: "ออฟไลน์คิว", ok: true, detail: "ไม่มีงานค้างในคิว (0 รายการ)" },
  ],
  uptimeDays: 47,
  version: "0.9.0",
};

async function getJson<T>(path: string, local: T): Promise<T> {
  try {
    const res = await fetch(`${API_URL}${path}`, {
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) throw new Error(`backend ${res.status}`);
    return (await res.json()) as T;
  } catch {
    if (!DEMO_MODE) return local;
    return local;
  }
}

export async function fetchNetwork(): Promise<SchoolNetwork> {
  return getJson("/api/demo/network", LOCAL_NETWORK);
}

export async function fetchMarketplace(): Promise<MarketplaceData> {
  return getJson("/api/demo/marketplace", LOCAL_MARKETPLACE);
}

export async function fetchNews(): Promise<NewsFeed> {
  return getJson("/api/demo/news", LOCAL_NEWS);
}

export async function fetchClubs(): Promise<ClubData> {
  return getJson("/api/demo/clubs", LOCAL_CLUBS);
}

export async function fetchSports(): Promise<SportsData> {
  return getJson("/api/demo/sports", LOCAL_SPORTS);
}

export async function fetchBookings(): Promise<BookingsData> {
  return getJson("/api/demo/bookings", LOCAL_BOOKINGS);
}

export async function fetchSurveys(): Promise<SurveysData> {
  return getJson("/api/demo/surveys", LOCAL_SURVEYS);
}

export async function fetchBadges(): Promise<BadgesData> {
  return getJson("/api/demo/badges", LOCAL_BADGES);
}

export async function fetchStatus(): Promise<SystemStatus> {
  return getJson("/api/demo/status", LOCAL_STATUS);
}
