export interface SchoolInfo {
  schoolName: string;
  address: string;
  phone: string;
  district: string;
  semester: string;
  year: string;
  teacherName: string;
  position: string;
  directorName: string;
  refNo: string;
}

export const SCHOOL_DEFAULTS: SchoolInfo = {
  schoolName: "โรงเรียนบ้านสวนฝั่งสุข",
  address: "12 หมู่ 3 ต.สวนฝั่ง อ.เมือง จ.สมุทรปราการ 10270",
  phone: "02-123-4567",
  district: "สำนักงานเขตพื้นที่การศึกษาประถมศึกษาสมุทรปราการ เขต 1",
  semester: "1",
  year: "2569",
  teacherName: "นางสาวสมหญิง ใจดี",
  position: "ครูผู้สอน",
  directorName: "นายประเสริฐ สุขสันต์",
  refNo: "____/2569",
};

const KEY = "solven.school";

export function loadSchool(): SchoolInfo {
  if (typeof window === "undefined") return SCHOOL_DEFAULTS;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return SCHOOL_DEFAULTS;
    const parsed = JSON.parse(raw) as Partial<SchoolInfo>;
    return { ...SCHOOL_DEFAULTS, ...parsed };
  } catch {
    return SCHOOL_DEFAULTS;
  }
}

export function saveSchool(patch: Partial<SchoolInfo>): SchoolInfo {
  const next = { ...loadSchool(), ...patch };
  try {
    window.localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    // storage unavailable — settings are a convenience, never a blocker
  }
  return next;
}
