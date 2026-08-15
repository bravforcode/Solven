"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AGENT_LABEL, AgentType, Draft } from "@/lib/types";
import { enqueueTask, flushQueue, listQueuedTasks, QueuedTask } from "@/lib/offlineQueue";
import CountUp from "@/components/reactbits/CountUp";
import Button from "@/components/ui/Button";
import Checkbox from "@/components/ui/Checkbox";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import CommandPalette from "@/components/ui/CommandPalette";
import Drawer from "@/components/ui/Drawer";
import ProfileMenu from "@/components/ui/ProfileMenu";
import { useToast, ToastType, ToastOptions } from "@/components/ui/ToastProvider";
import { buildCommands, CommandItem } from "@/lib/commands";
import { useSelection, useShortcuts, useMediaQuery } from "@/lib/hooks";
import { applyBatch, patchDraftStatus } from "@/lib/drafts";
import {
  buildCertificateHtml,
  buildLessonRecordHtml,
  buildMemoHtml,
  buildOfficialLetterHtml,
  buildOrderHtml,
  buildPp5Html,
  buildPp6Html,
  buildSummaryReportHtml,
  buildWorksheetHtml,
  DOC_TYPE_LABEL,
  DocType,
  printDocument,
} from "@/lib/documents";
import { loadSchool } from "@/lib/school";
import { listenOnce } from "@/lib/voice";
import { speak } from "@/lib/tts";
import { judgeOutput, localJudge, saveRating } from "@/lib/feedback";

/* ============ types & constants ============ */

type View = "create" | "queue" | "docs";
type StatusFilter = "all" | Draft["status"];
type SortOrder = "newest" | "oldest" | "agent";

interface RubricPreset {
  name: string;
  text: string;
}

interface ConfirmState {
  kind: "reject" | "reject-batch" | "delete-preset";
  id?: string;
  name?: string;
  warnings?: string[];
  count?: number;
}

const AGENT_OPTIONS: AgentType[] = ["grading", "lesson-plan", "reporting"];

const AGENT_DESC: Record<AgentType, string> = {
  grading: "ตรวจงาน/ข้อสอบตาม rubric + feedback รายบุคคล",
  "lesson-plan": "ร่างแผนการสอนตรงหลักสูตร ปรับตามห้องจริง",
  reporting: "ร่างรายงาน/ข้อความหาผู้ปกครอง-ผู้บริหาร",
};

const AGENT_HINTS: Record<AgentType, string> = {
  grading: "วางคำตอบนักเรียน — 1 บรรทัดต่อ 1 คน (ใส่ได้หลายคนพร้อมกัน)",
  "lesson-plan": "เช่น เรื่อง เศษส่วน ป.5",
  reporting: "เช่น สรุปพัฒนาการการอ่านของเด็กหญิงสมหญิง",
};

const RECIPIENTS = ["ผู้ปกครอง", "ผู้บริหาร", "กรรมการสถานศึกษา"];
const TONES = ["สุภาพ เป็นทางการ", "เป็นกันเอง อบอุ่น", "กระชับ ตรงประเด็น"];
const GRADE_OPTIONS = ["ป.1", "ป.2", "ป.3", "ป.4", "ป.5", "ป.6", "ม.1", "ม.2", "ม.3", "ม.4", "ม.5", "ม.6", "คละชั้น"];
const DURATIONS = ["50 นาที", "60 นาที", "80 นาที", "100 นาที", "ครึ่งวัน"];

const PRESETS_KEY = "solven.rubricPresets";
const SETTINGS_KEY = "solven.settings";
const DEFAULT_PRESET: RubricPreset = {
  name: "ตัวอย่าง: สังคมศึกษา",
  text: "ตอบครบประเด็น 3 ข้อ = 3 คะแนน\nอธิบายเหตุผลประกอบ = 2 คะแนน\nภาษา/การเขียนเรียบร้อย = 1 คะแนน\nรวม 6 คะแนน",
};

interface Settings {
  grade?: string;
  duration?: string;
  tone?: string;
}

function readSettings(): Settings {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(SETTINGS_KEY);
    return raw ? (JSON.parse(raw) as Settings) : {};
  } catch {
    return {};
  }
}

function saveSettings(patch: Settings) {
  try {
    window.localStorage.setItem(SETTINGS_KEY, JSON.stringify({ ...readSettings(), ...patch }));
  } catch {
    // storage unavailable — settings are a convenience, never a blocker
  }
}

/** Synthetic demo content — clearly labeled, no real student data (PDPA). */
const DEMO_TASKS: { agent: AgentType; input: string; rubric?: string }[] = [
  {
    agent: "grading",
    input: "คำตอบ (ตัวอย่าง): 2+2=4 เพราะเรานับนิ้วรวมกัน",
    rubric: "ตอบถูก = 2 คะแนน\nอธิบายเหตุผล = 2 คะแนน",
  },
  {
    agent: "grading",
    input: "คำตอบ (ตัวอย่าง): ประเทศไทยมีประชากรประมาณ 66 ล้านคน",
    rubric: "ตอบถูก = 2 คะแนน\nอธิบายเหตุผล = 2 คะแนน",
  },
  {
    agent: "lesson-plan",
    input: "หัวข้อ/ตัวชี้วัด: การบวกเศษส่วนที่มีตัวส่วนเท่ากัน\nระดับชั้น: ป.5\nจำนวนนักเรียน: 30\nเวลาที่มี: 60 นาที",
  },
  {
    agent: "reporting",
    input:
      "ผู้รับ: ผู้ปกครอง\nน้ำเสียง: สุภาพ เป็นทางการ\nเบอร์ติดต่อ: 0812345678\nสรุปความก้าวหน้าของนักเรียน: อ่านหนังสือคล่องขึ้น ส่งงานตรงเวลามากขึ้น\n(ตัวอย่างข้อมูลที่ครูอาจเผลอใส่ — ระบบจะเตือนถ้าติดไปในร่าง)",
  },
];

const VIEW_TITLES: Record<View, { title: string; sub: string }> = {
  create: { title: "สร้างงาน", sub: "เลือกงานที่อยากให้ช่วย — ผลลัพธ์ทุกชิ้นเป็นร่างที่ครูต้องอนุมัติ" },
  queue: { title: "คิวตรวจ", sub: "ตรวจสอบและอนุมัติร่างที่ agent สร้างให้ — ทุกชิ้นต้องผ่านครู" },
  docs: { title: "เอกสาร", sub: "สร้างเอกสารราชการจากร่างที่อนุมัติ — พิมพ์หรือบันทึก PDF ได้ทันที" },
};

/* ============ helpers ============ */

function fmtTime(iso: string): string {
  try {
    return new Date(iso).toLocaleString("th-TH", {
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

function splitAnswers(text: string): string[] {
  return text
    .split(/\n+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    try {
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      const ok = document.execCommand("copy");
      document.body.removeChild(ta);
      return ok;
    } catch {
      return false;
    }
  }
}

/** Classify guardrail warnings into user-visible trust badges (Appendix A.9). */
interface GuardrailTag {
  label: string;
  tone: "ok" | "pii" | "warn";
}

const MOCK_INFO_RE = /^รันด้วย mock/;

function guardrailTags(warnings: string[]): GuardrailTag[] {
  const real = warnings.filter((w) => !MOCK_INFO_RE.test(w));
  if (real.length === 0) return [{ label: "Guardrail ผ่านทุกเช็ค", tone: "ok" }];
  const tags: GuardrailTag[] = [];
  if (real.some((w) => /เบอร์โทร|บัตรประชาชน|อีเมล/.test(w))) {
    tags.push({ label: "พบข้อมูลส่วนตัว (PII)", tone: "pii" });
  }
  if (real.some((w) => /ตัวเลขคะแนน/.test(w))) {
    tags.push({ label: "ตัวเลขไม่ตรงข้อมูลต้นทาง", tone: "warn" });
  }
  if (real.some((w) => /เป็นร่าง|human-in-the-loop/.test(w))) {
    tags.push({ label: "ไม่มีคำเตือนว่าเป็นร่าง", tone: "warn" });
  }
  if (tags.length === 0) tags.push({ label: "ต้องตรวจทานก่อนอนุมัติ", tone: "warn" });
  return tags;
}

function downloadDraft(d: Draft): void {
  const stamp = new Date(d.createdAt).toISOString().slice(0, 10);
  const blob = new Blob([d.output], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `solven-${d.agent}-${stamp}.txt`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function loadPresets(): RubricPreset[] {
  if (typeof window === "undefined") return [DEFAULT_PRESET];
  try {
    const raw = window.localStorage.getItem(PRESETS_KEY);
    const parsed = raw ? (JSON.parse(raw) as RubricPreset[]) : [];
    return [DEFAULT_PRESET, ...parsed];
  } catch {
    return [DEFAULT_PRESET];
  }
}

/* ============ icons ============ */

function Icon({ d, size = 17 }: { d: string; size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={d} />
    </svg>
  );
}

const ICONS: Record<AgentType, string> = {
  grading:
    "M9 11l3 3L22 4 M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11",
  "lesson-plan":
    "M4 19.5A2.5 2.5 0 016.5 17H20 M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z M8 7h8 M8 11h8",
  reporting:
    "M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z M8 9h8 M8 13h5",
};

const ICON_CREATE =
  "M12 5v14 M5 12h14";
const ICON_QUEUE =
  "M8 6h13 M8 12h13 M8 18h13 M3 6h.01 M3 12h.01 M3 18h.01";
const ICON_DOCS =
  "M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z M14 2v6h6 M9 13h6 M9 17h6";
const ICON_COPY =
  "M8 8h12a1 1 0 011 1v12a1 1 0 01-1 1H8a1 1 0 01-1-1V9a1 1 0 011-1z M16 8V4a1 1 0 00-1-1H4a1 1 0 00-1 1v12a1 1 0 001 1h4";
const ICON_DOWNLOAD =
  "M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4 M7 10l5 5 5-5 M12 15V3";
const ICON_SEND =
  "M22 2L11 13 M22 2l-7 20-4-9-9-4 22-7z";

/* ============ app ============ */

export default function Home() {
  const [view, setView] = useState<View>("create");
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [draftsLoading, setDraftsLoading] = useState(true);
  const [draftsError, setDraftsError] = useState("");
  const [engine, setEngine] = useState<string>("");
  const [queuedCount, setQueuedCount] = useState(0);
  const [isOnline, setIsOnline] = useState(true);

  // create-form state
  const [agent, setAgent] = useState<AgentType>("grading");
  const [input, setInput] = useState("");
  const [rubric, setRubric] = useState("");
  const [presetName, setPresetName] = useState("");
  const [presets, setPresets] = useState<RubricPreset[]>([]);
  const [topic, setTopic] = useState("");
  // defaults come from Settings (localStorage); the form uses them as prefilled
  const [grade, setGrade] = useState(() => readSettings().grade ?? "ป.5");
  const [students, setStudents] = useState("30");
  const [duration, setDuration] = useState(() => readSettings().duration ?? DURATIONS[0]);
  const [recipient, setRecipient] = useState(RECIPIENTS[0]);
  const [tone, setTone] = useState(() => readSettings().tone ?? TONES[0]);
  const [summary, setSummary] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const [formError, setFormError] = useState("");

  // queue state
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [agentFilter, setAgentFilter] = useState<"all" | AgentType>("all");
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<SortOrder>("newest");

  // new-feature state
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [drawerDraft, setDrawerDraft] = useState<Draft | null>(null);
  const [confirm, setConfirm] = useState<ConfirmState | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [flashId, setFlashId] = useState<string | null>(null);
  const [bulkBusy, setBulkBusy] = useState(false);

  // document studio state
  const [docType, setDocType] = useState<DocType>("worksheet");
  const [docPrefill, setDocPrefill] = useState<{ type: DocType; content: string } | null>(null);
  const [docFields, setDocFields] = useState({
    number: "",
    subject: "",
    grade: "ป.5",
    date: new Date().toLocaleDateString("th-TH"),
    instructions: "",
    body: "",
    unit: "",
    students: "30",
    indicators: "",
    results: "",
    problems: "",
    fixes: "",
    refNo: "",
    to: "",
    letterSubject: "",
    studentName: "",
    detail: "",
    directorName: "",
    birthDate: "",
    gpa: "",
    subjectsText: "",
    from: "",
    senderName: "",
  });
  const [docSourceId, setDocSourceId] = useState("");
  // feature 4/5/13/3/10/33: voice input, TTS, feedback rating, LINE preview,
  // OCR upload mock, cost display
  const [voiceBusy, setVoiceBusy] = useState(false);
  const [linePreviewId, setLinePreviewId] = useState<string | null>(null);
  const [ratings, setRatings] = useState<Record<string, number>>({});
  const setDoc = useCallback((k: keyof typeof docFields, v: string) => {
    setDocFields((prev) => ({ ...prev, [k]: v }));
  }, []);

  const goDocs = useCallback((type?: DocType) => {
    if (type) setDocType(type);
    setView("docs");
  }, []);

  const approvedDrafts = drafts.filter((d) => d.status === "approved");
  // REVIEW F8: survive reload — backend presence also visible via draft engine
  const hasBackend = engine === "backend" || drafts.some((d) => d.engine === "backend");
  const DOC_SOURCE_AGENT: Partial<Record<DocType, AgentType[]>> = {
    worksheet: ["grading"],
    "lesson-record": ["lesson-plan"],
    "official-letter": ["reporting"],
    certificate: ["grading", "reporting"],
    pp5: ["grading"],
    pp6: ["grading"],
    order: ["reporting"],
    memo: ["reporting"],
  };
  const docSourceDrafts = approvedDrafts.filter((d) =>
    (DOC_SOURCE_AGENT[docType] ?? []).includes(d.agent)
  );

  function applyDocSource(id: string) {
    const d = docSourceDrafts.find((x) => x.id === id);
    if (!d) return;
    setDocSourceId(id);
    if (docType === "worksheet") {
      setDoc("body", d.output);
    } else if (docType === "lesson-record") {
      setDoc("results", d.output);
    } else if (docType === "official-letter") {
      setDoc("letterSubject", docFields.letterSubject || "รายงานความก้าวหน้านักเรียน");
      setDoc("body", d.output);
    } else if (docType === "certificate") {
      setDoc("detail", d.output);
    } else if (docType === "pp5" || docType === "pp6") {
      setDoc("subjectsText", d.output);
    } else if (docType === "order" || docType === "memo") {
      setDoc("body", d.output);
    }
  }

  const school = loadSchool();
  const docHtml = useMemo(() => {
    const s = loadSchool();
    switch (docType) {
      case "worksheet":
        return buildWorksheetHtml(s, docFields);
      case "lesson-record":
        return buildLessonRecordHtml(s, {
          subject: docFields.subject,
          unit: docFields.unit,
          grade: docFields.grade,
          students: docFields.students,
          date: docFields.date,
          indicators: docFields.indicators,
          results: docFields.results,
          problems: docFields.problems,
          fixes: docFields.fixes,
          teacherName: s.teacherName,
        });
      case "official-letter":
        return buildOfficialLetterHtml(s, {
          refNo: docFields.refNo,
          date: docFields.date,
          subject: docFields.letterSubject,
          to: docFields.to,
          body: docFields.body,
          teacherName: s.teacherName,
          position: s.position,
        });
      case "certificate":
        return buildCertificateHtml(s, {
          studentName: docFields.studentName,
          detail: docFields.detail,
          directorName: s.directorName,
          date: docFields.date,
        });
      case "summary":
        return buildSummaryReportHtml(s, approvedDrafts);
      case "pp5":
        return buildPp5Html(s, {
          studentName: docFields.studentName,
          grade: docFields.grade,
          semester: s.semester,
          year: s.year,
          subjects: docFields.subjectsText
            .split("\n")
            .map((line) => line.trim())
            .filter(Boolean)
            .map((line) => {
              const [name, score = "", grade = ""] = line.split(",").map((x) => x.trim());
              return { name, score, grade };
            }),
          teacherName: s.teacherName,
        });
      case "pp6":
        return buildPp6Html(s, {
          studentName: docFields.studentName,
          birthDate: docFields.birthDate,
          grade: docFields.grade,
          semester: s.semester,
          year: s.year,
          gpa: docFields.gpa,
          directorName: s.directorName,
          date: docFields.date,
        });
      case "order":
        return buildOrderHtml(s, {
          refNo: docFields.refNo,
          date: docFields.date,
          subject: docFields.letterSubject,
          body: docFields.body,
          directorName: s.directorName,
        });
      case "memo":
        return buildMemoHtml(s, {
          from: docFields.from,
          to: docFields.to,
          date: docFields.date,
          subject: docFields.letterSubject,
          body: docFields.body,
          senderName: docFields.senderName || s.teacherName,
        });
    }
  }, [docType, docFields, approvedDrafts]);

  function handlePrintDoc() {
    if (docType === "summary" && approvedDrafts.length === 0) {
      pushToast("info", "ยังไม่มีงานที่อนุมัติให้พิมพ์สรุป");
      return;
    }
    printDocument(docHtml, { landscape: docType === "certificate" });
  }

  async function downloadPdf() {
    try {
      const fields = {
        ...docFields,
        // backend reads `subject`; the letter form stores it as `letterSubject`
        subject: docType === "official-letter" ? docFields.letterSubject : docFields.subject,
      };
      if (docType === "summary") {
        fields.body = approvedDrafts
          .map((d) => `${AGENT_LABEL[d.agent]} — ${fmtTime(d.createdAt)}\n\n${d.output}`)
          .join("\n\n---\n\n");
      }
      const res = await fetch("/api/documents/render", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind: docType, fields, school: loadSchool() }),
      });
      if (!res.ok) {
        // surface backend detail (e.g. "missing fields: ['body']") in the toast
        let detail = `HTTP ${res.status}`;
        try {
          const body = (await res.json()) as { error?: string };
          if (body.error) detail = body.error;
        } catch {
          /* non-JSON error body — keep status */
        }
        throw new Error(detail);
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `solven-${docType}-${new Date().toISOString().slice(0, 10)}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      pushToast("success", "ดาวน์โหลด PDF แล้ว");
    } catch (err) {
      pushToast("error", `สร้าง PDF ไม่สำเร็จ: ${err instanceof Error ? err.message : err}`);
    }
  }

  // consume "ทำเป็นเอกสาร" prefill from the queue when arriving at docs
  useEffect(() => {
    if (view !== "docs" || !docPrefill) return;
    const p = docPrefill;
    setDocType(p.type);
    setDocFields((prev) => {
      // REVIEW F1: field targeting must mirror applyDocSource — the
      // lesson-record form renders `results`, not `body`
      if (p.type === "lesson-record") return { ...prev, results: p.content };
      if (p.type === "official-letter")
        return {
          ...prev,
          letterSubject: prev.letterSubject || "รายงานความก้าวหน้านักเรียน",
          body: p.content,
        };
      return { ...prev, body: p.content };
    });
    setDocPrefill(null);
  }, [view, docPrefill]);

  const { push } = useToast();
  const pushToast = useCallback(
    (type: ToastType, text: string, opts?: ToastOptions) => push(type, text, opts),
    [push]
  );

  const isMobile = useMediaQuery("(max-width: 900px)");
  const isDesktop = useMediaQuery("(min-width: 900px)");

  /* ----- drafts ----- */
  const loadDrafts = useCallback(async () => {
    setDraftsLoading(true);
    setDraftsError("");
    try {
      const res = await fetch("/api/drafts");
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setDrafts(await res.json());
    } catch (err) {
      setDraftsError(err instanceof Error ? err.message : String(err));
    } finally {
      setDraftsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDrafts();
    setPresets(loadPresets());
  }, [loadDrafts]);

  // Auto-seed demo data on first load in demo mode: the in-memory store
  // resets on every server restart, so without this the queue opens as an
  // empty dead end until the user finds the (hidden) seed button. The manual
  // seed button stays as the explicit fallback. Never changes the current view.
  useEffect(() => {
    if (process.env.NEXT_PUBLIC_SOLVEN_MODE !== "demo") return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/demo/seed", { method: "POST" });
        if (!res.ok) return;
        const body = (await res.json()) as { seeded?: number };
        if ((body.seeded ?? 0) > 0 && !cancelled) loadDrafts();
      } catch {
        // offline or backend down with local seed unavailable — the manual
        // seed button in the empty state still covers this
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [loadDrafts]);

  /* ----- offline queue (Appendix A.8) ----- */
  const refreshQueuedCount = useCallback(async () => {
    setQueuedCount((await listQueuedTasks()).length);
  }, []);

  const flushOfflineQueue = useCallback(async () => {
    const submitOne = async (task: QueuedTask): Promise<boolean> => {
      try {
        const res = await fetch("/api/coordinator", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            agent: task.agent,
            input: task.input,
            rubric: task.rubric,
            client_task_id: task.clientTaskId,
          }),
        });
        return res.ok;
      } catch {
        return false;
      }
    };
    const flushed = await flushQueue(submitOne);
    if (flushed > 0) {
      pushToast("success", `ส่งงานที่ค้างไว้ตอนออฟไลน์สำเร็จ ${flushed} รายการ`);
      await loadDrafts();
    }
    await refreshQueuedCount();
  }, [loadDrafts, pushToast, refreshQueuedCount]);

  const registerBackgroundSync = useCallback(async () => {
    try {
      if ("serviceWorker" in navigator && "SyncManager" in window) {
        const reg = await navigator.serviceWorker.ready;
        // @ts-expect-error - background sync isn't in default lib.dom typings
        await reg.sync.register("solven-sync");
      }
    } catch {
      // best-effort — the 'online' listener below is the fallback path
    }
  }, []);

  useEffect(() => {
    refreshQueuedCount();
    setIsOnline(navigator.onLine);
    const onOnline = () => {
      setIsOnline(true);
      flushOfflineQueue();
    };
    const onOffline = () => setIsOnline(false);
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    const onSwMessage = (e: MessageEvent) => {
      if (e.data?.type === "solven-sync-flushed") {
        loadDrafts();
        refreshQueuedCount();
      }
    };
    navigator.serviceWorker?.addEventListener?.("message", onSwMessage);
    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
      navigator.serviceWorker?.removeEventListener?.("message", onSwMessage);
    };
  }, [flushOfflineQueue, loadDrafts, refreshQueuedCount]);

  // Settings: persist preference changes (grade/duration/tone)
  useEffect(() => {
    saveSettings({ grade, duration, tone });
  }, [grade, duration, tone]);

  // Auto-refresh the review queue while it's open (teachers leave the tab on)
  useEffect(() => {
    if (view !== "queue") return;
    const timer = window.setInterval(() => {
      loadDrafts().catch(() => {});
    }, 30000);
    return () => window.clearInterval(timer);
  }, [view, loadDrafts]);

  /* ----- create payloads ----- */
  function buildPayloads(): { agent: AgentType; input: string; rubric?: string }[] {
    if (agent === "grading") {
      const answers = splitAnswers(input);
      if (answers.length === 0) {
        setFormError("ยังไม่มีคำตอบนักเรียน — วางคำตอบอย่างน้อย 1 บรรทัด");
        return [];
      }
      return answers.map((a) => ({ agent, input: a, rubric: rubric || undefined }));
    }
    if (agent === "lesson-plan") {
      if (!topic.trim()) {
        setFormError("กรุณากรอกหัวข้อ/ตัวชี้วัดบทเรียน");
        return [];
      }
      const inputText =
        `หัวข้อ/ตัวชี้วัด: ${topic.trim()}\n` +
        `ระดับชั้น: ${grade}\n` +
        `จำนวนนักเรียน: ${students.trim() || "ไม่ระบุ"}\n` +
        `เวลาที่มี: ${duration}`;
      return [{ agent, input: inputText }];
    }
    if (!summary.trim()) {
      setFormError("กรุณากรอกสรุปความก้าวหน้าที่จะใช้ร่างข้อความ");
      return [];
    }
    const inputText =
      `ผู้รับ: ${recipient}\nน้ำเสียง: ${tone}\n` +
      `สรุปความก้าวหน้าของนักเรียน: ${summary.trim()}`;
    return [{ agent, input: inputText }];
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (submitting) return;
    setFormError("");
    const payloads = buildPayloads();
    if (payloads.length === 0) return;

    // AUD-H-13: grading requires a rubric — stop before any request so the
    // teacher sees a clear reason instead of an opaque 400 from the server.
    if (agent === "grading" && (!rubric || !rubric.trim())) {
      setFormError("ตรวจงานต้องระบุเกณฑ์การให้คะแนน (rubric) ก่อนส่ง");
      pushToast("error", "ต้องระบุเกณฑ์การให้คะแนนก่อนส่งงานตรวจ");
      return;
    }

    setSubmitting(true);
    setProgress({ done: 0, total: payloads.length });
    let lastEngine = "";
    let created = 0;
    let queued = 0;
    try {
      for (let i = 0; i < payloads.length; i++) {
        setProgress({ done: i, total: payloads.length });
        const clientTaskId = crypto.randomUUID();
        try {
          const res = await fetch("/api/coordinator", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ ...payloads[i], client_task_id: clientTaskId }),
          });
          if (!res.ok) {
            // surface the server's reason (e.g. backend unavailable, rubric error)
            let detail = `HTTP ${res.status}`;
            try {
              const body = (await res.json()) as { error?: string };
              if (body.error) detail = body.error;
            } catch {
              /* non-JSON error body — keep status code */
            }
            throw new Error(detail);
          }
          const data = (await res.json()) as { engine?: string; engineError?: string | null };
          lastEngine = data.engine ?? lastEngine;
          if (data.engine === "mock") {
            pushToast(
              "info",
              data.engineError
                ? `backend ไม่พร้อมใช้งาน (${data.engineError}) — ใช้ mock ในเครื่อง`
                : "backend ไม่พร้อมใช้งาน — ใช้ mock ในเครื่อง (ดู README)"
            );
          }
          created++;
        } catch (err) {
          // network-level failure (truly offline) — queue for background sync
          // instead of aborting the whole batch. Anything else (HTTP error) rethrows.
          if (!(err instanceof TypeError)) throw err;
          await enqueueTask({
            clientTaskId,
            agent: payloads[i].agent,
            input: payloads[i].input,
            rubric: payloads[i].rubric,
            createdAt: new Date().toISOString(),
          });
          queued++;
        }
      }
      if (queued > 0) {
        await registerBackgroundSync();
        await refreshQueuedCount();
        pushToast(
          "info",
          `ออฟไลน์ — บันทึกงาน ${queued} รายการไว้ในคิว จะส่งอัตโนมัติเมื่อกลับมาออนไลน์`
        );
      }
      if (created > 0) {
        setEngine(lastEngine);
        if (created > 1) pushToast("success", `สร้างร่าง ${created} รายการแล้ว — ไปตรวจที่คิว`);
        else pushToast("success", "สร้างร่างแล้ว — ไปตรวจที่คิว");
      }
      setInput("");
      setSummary("");
      setRubric("");
      setTopic("");
      await loadDrafts();
      if (created > 0) setView("queue");
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setFormError(`ส่งงานล้มเหลว (${msg}) — ลองใหม่`);
      pushToast("error", `ส่งงานล้มเหลว: ${msg}`);
    } finally {
      setSubmitting(false);
      setProgress(null);
    }
  }

  /* ----- review actions (single + undo) ----- */
  async function setDraftStatus(id: string, status: "approved" | "rejected") {
    if (busyId) return;
    setBusyId(id);
    try {
      const updated = await patchDraftStatus(id, status);
      if (!updated) throw new Error("backend ไม่พร้อมใช้งาน (อัปเดตสถานะไม่สำเร็จ)");
      setDrafts((ds) => ds.map((d) => (d.id === id ? updated : d)));
      setFlashId(id);
      const label = status === "approved" ? "อนุมัติ" : "ปฏิเสธ";
      pushToast("success", `${label}แล้ว`, {
        actionLabel: "เลิกทำ",
        onAction: () => {
          patchDraftStatus(id, "pending").then((u) => {
            if (u) {
              setDrafts((ds) => ds.map((d) => (d.id === id ? u : d)));
              pushToast("info", "เลิกทำแล้ว");
            }
          });
        },
      });
    } catch (err) {
      pushToast("error", `ไม่สามารถอัปเดตได้: ${err instanceof Error ? err.message : err}`);
    } finally {
      setBusyId(null);
    }
  }

  function handleReject(d: Draft) {
    if (d.warnings.length > 0) {
      setConfirm({ kind: "reject", id: d.id, warnings: d.warnings });
    } else {
      setDraftStatus(d.id, "rejected");
    }
  }

  /* ----- batch actions ----- */
  const resetFilters = useCallback(() => {
    setStatusFilter("all");
    setAgentFilter("all");
    setSearch("");
    setSort("newest");
  }, []);

  async function undoBatch(targets: Draft[], status: "approved" | "rejected") {
    let n = 0;
    for (const d of targets) {
      const u = await patchDraftStatus(d.id, "pending");
      if (u) {
        n++;
        setDrafts((ds) => ds.map((x) => (x.id === d.id ? u : x)));
      }
    }
    if (n > 0) pushToast("info", `เลิกทำ ${n} รายการแล้ว (กลับเป็นรออนุมัติ)`);
  }

  async function doBatch(status: "approved" | "rejected", targets: Draft[]) {
    setBulkBusy(true);
    try {
      const { ok, fail } = await applyBatch(targets, status);
      selection.clear();
      await loadDrafts();
      if (ok > 0) {
        const verb = status === "approved" ? "อนุมัติ" : "ปฏิเสธ";
        pushToast("success", ok === 1 ? `${verb} 1 รายการแล้ว` : `${verb} ${ok} รายการแล้ว`, {
          actionLabel: "เลิกทำ",
          onAction: () => undoBatch(targets, status),
        });
      }
      if (fail.length > 0) {
        pushToast("error", `ไม่สำเร็จ ${fail.length} รายการ (HTTP error) — ลองใหม่`);
      }
    } finally {
      setBulkBusy(false);
    }
  }

  function handleBatch(status: "approved" | "rejected") {
    const targets = filtered.filter((d) => d.status === "pending" && selection.selected.has(d.id));
    if (targets.length === 0) return;
    if (status === "rejected") {
      const withWarnings = targets.filter((d) => d.warnings.length > 0);
      if (withWarnings.length > 0) {
        setConfirm({
          kind: "reject-batch",
          count: withWarnings.length,
          warnings: withWarnings.flatMap((d) => d.warnings).slice(0, 5),
        });
        return;
      }
    }
    doBatch(status, targets);
  }

  async function handleCopy(d: Draft) {
    const ok = await copyText(d.output);
    pushToast(ok ? "success" : "error", ok ? "คัดลอกผลลัพธ์แล้ว" : "คัดลอกไม่สำเร็จ");
  }

  async function handleCopyLine(d: Draft) {
    const text = [
      `📋 ${AGENT_LABEL[d.agent]} · ${fmtTime(d.createdAt)}`,
      "",
      d.output,
      "",
      "— ร่างจาก Solven (กรุณาตรวจทานก่อนส่งต่อ) —",
    ].join("\n");
    const ok = await copyText(text);
    pushToast(
      ok ? "success" : "error",
      ok ? "คัดลอกสำหรับ LINE แล้ว — วางในแชทได้เลย" : "คัดลอกไม่สำเร็จ"
    );
  }

  /* ----- convenience: demo data + export ----- */
  const seedDemoData = useCallback(async () => {
    if (submitting) return;
    setSubmitting(true);
    let created = 0;
    let fullStates = false; // true only when the backend full dataset was used
    try {
      // full demo dataset from the backend (drafts across all states + audit runs)
      try {
        const res = await fetch("/api/demo/seed", { method: "POST" });
        if (res.ok) {
          const body = (await res.json()) as { seeded?: number };
          created = body.seeded ?? 0;
          fullStates = created > 0;
        } else if (res.status !== 404 && res.status !== 401) {
          throw new Error(`HTTP ${res.status}`);
        }
        // 404/401 (no demo endpoint in this deployment) → fall through to local
      } catch {
        // backend unreachable → fall through to the local pipeline-driven seeds
      }
      if (created === 0) {
        // local fallback: each task submitted independently so one failure
        // does not abort the whole seed (I-1)
        for (const task of DEMO_TASKS) {
          try {
            const res = await fetch("/api/coordinator", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(task),
            });
            if (res.ok) created++;
          } catch {
            /* per-task failure — continue with the rest */
          }
        }
      }
      // seed rubric presets once (localStorage) so forms show real examples
      try {
        const existing = loadPresets();
        if (existing.length <= 1) {
          const demoPresets: RubricPreset[] = [
            { name: "วิชาไทย ม.2 — เรียงความ", text: "โครงสร้างครบ (นำ/เนื้อ/สรุป) = 4\nภาษาเรียบเรียงดี = 3\nสะกดถูกต้อง = 2\nรวม 9 คะแนน" },
            { name: "คณิต ป.5 — เศษส่วน", text: "วิธีทำถูกต้อง = 3\nคำตอบถูก = 2\nแสดงเหตุผล = 1\nรวม 6 คะแนน" },
          ];
          window.localStorage.setItem(
            PRESETS_KEY,
            JSON.stringify(demoPresets)
          );
          setPresets(loadPresets());
        }
      } catch {
        /* localStorage unavailable — presets stay default */
      }
      await loadDrafts();
      pushToast(
        created > 0 ? "success" : "error",
        created > 0
          ? fullStates
            ? `โหลดข้อมูลตัวอย่างแล้ว ${created} รายการ (ครบทุกสถานะ: รอตรวจ/อนุมัติ/ปฏิเสธ/กักกัน) — ตรวจและอนุมัติได้เลย`
            : `โหลดข้อมูลตัวอย่างแล้ว ${created} รายการ (ผ่าน pipeline จริง) — ตรวจและอนุมัติได้เลย`
          : "โหลดข้อมูลตัวอย่างไม่สำเร็จ — ตรวจ backend ก่อน"
      );
      if (created > 0) setView("queue");
    } catch (err) {
      pushToast("error", `โหลดข้อมูลตัวอย่างล้มเหลว: ${err instanceof Error ? err.message : err}`);
    } finally {
      setSubmitting(false);
    }
  }, [submitting, loadDrafts, pushToast, setPresets]);

  function exportApproved() {
    const approved = drafts.filter((d) => d.status === "approved");
    if (approved.length === 0) {
      pushToast("info", "ยังไม่มีรายการที่อนุมัติให้ส่งออก");
      return;
    }
    const lines = [
      "# Solven — งานที่อนุมัติแล้ว",
      "",
      `สร้างเมื่อ: ${new Date().toLocaleString("th-TH")}`,
      `จำนวน: ${approved.length} รายการ`,
      "",
      ...approved.flatMap((d) => [
        `## ${AGENT_LABEL[d.agent]} — ${fmtTime(d.createdAt)}`,
        "",
        d.output,
        "",
        "---",
        "",
      ]),
    ];
    const blob = new Blob([lines.join("\n")], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `solven-approved-${new Date().toISOString().slice(0, 10)}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    pushToast("success", `ส่งออก ${approved.length} รายการเป็นไฟล์ .md แล้ว`);
  }

  /* ----- presets ----- */
  function savePreset() {
    const name = presetName.trim() || `Rubric ${presets.length}`;
    if (!rubric.trim()) {
      pushToast("error", "กรุณาใส่เนื้อหา rubric ก่อนบันทึก");
      return;
    }
    const next = [...presets.filter((p) => p.name !== DEFAULT_PRESET.name), { name, text: rubric }];
    setPresets(next);
    window.localStorage.setItem(PRESETS_KEY, JSON.stringify(next.filter((p) => p.name !== DEFAULT_PRESET.name)));
    setPresetName("");
    pushToast("success", `บันทึก rubric "${name}" แล้ว`);
  }

  function doDeletePreset(name: string) {
    if (name === DEFAULT_PRESET.name) return;
    const next = presets.filter((p) => p.name !== name);
    setPresets(next);
    window.localStorage.setItem(PRESETS_KEY, JSON.stringify(next.filter((p) => p.name !== DEFAULT_PRESET.name)));
    pushToast("info", `ลบ "${name}" แล้ว`);
  }

  function requestDeletePreset() {
    const sel = (document.getElementById("preset-select") as HTMLSelectElement)?.value;
    if (sel && sel !== DEFAULT_PRESET.name) setConfirm({ kind: "delete-preset", name: sel });
  }

  function applyPreset(name: string) {
    const p = presets.find((x) => x.name === name);
    if (p) setRubric(p.text);
  }

  /* ----- derived ----- */
  // quarantined drafts are awaiting review too — count them as pending work
  const pendingCount = drafts.filter(
    (d) => d.status === "pending" || d.status === "quarantined"
  ).length;
  const approvedCount = drafts.filter((d) => d.status === "approved").length;
  const rejectedCount = drafts.filter((d) => d.status === "rejected").length;

  const filtered = useMemo(() => {
    return drafts.filter((d) => {
      if (statusFilter !== "all" && d.status !== statusFilter) return false;
      if (agentFilter !== "all" && d.agent !== agentFilter) return false;
      if (search.trim()) {
        const q = search.trim().toLowerCase();
        if (!d.output.toLowerCase().includes(q) && !d.input.toLowerCase().includes(q))
          return false;
      }
      return true;
    });
  }, [drafts, statusFilter, agentFilter, search]);

  const sorted = useMemo(() => {
    const arr = [...filtered];
    if (sort === "oldest") {
      arr.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    } else if (sort === "agent") {
      arr.sort((a, b) => AGENT_LABEL[a.agent].localeCompare(AGENT_LABEL[b.agent], "th"));
    }
    return arr;
  }, [filtered, sort]);

  // batch selection — scope to selectable (pending) ids so select-all/counts stay truthful
  const visiblePendingIds = sorted.filter((d) => d.status === "pending").map((d) => d.id);

  const selection = useSelection(
    visiblePendingIds,
    `${statusFilter}|${agentFilter}|${search}|${sort}|${drafts.length}`
  );

  const canSubmit =
    agent === "grading" ? input.trim().length > 0 :
    agent === "lesson-plan" ? topic.trim().length > 0 :
    summary.trim().length > 0;

  /* ----- command palette ----- */
  const paletteItems = useMemo<CommandItem[]>(
    () =>
      buildCommands({
        goCreate: (a) => {
          setFormError("");
          if (a) setAgent(a);
          setView("create");
        },
        goQueue: () => setView("queue"),
        goDocs: (type) => goDocs(type),
        goSettings: () => {
          window.location.href = "/settings";
        },
        printCurrent: () => {
          if (view === "docs") handlePrintDoc();
          else pushToast("info", "ไปที่หน้าเอกสาร แล้วกดพิมพ์อีกครั้ง");
        },
        setStatusFilter: (s) => setStatusFilter(s),
        setAgentFilter: (a) => setAgentFilter(a),
        resetFilters,
        seedDemo: () => {
          setView("queue");
          seedDemoData();
        },
      }),
    [goDocs, handlePrintDoc, resetFilters, seedDemoData, view, pushToast]
  );

  /* ----- keyboard shortcuts (desktop only) ----- */
  const focusSearch = useCallback(() => {
    document.querySelector<HTMLInputElement>('input[aria-label="ค้นหา"]')?.focus();
  }, []);
  const focusAnswers = useCallback(() => {
    document.getElementById("answers")?.focus();
  }, []);

  useShortcuts(
    {
      goCreate: () => setView("create"),
      goQueue: () => setView("queue"),
      goDocs: () => goDocs(),
      goSettings: () => {
        window.location.href = "/settings";
      },
      printCurrent: () => {
        if (view === "docs") handlePrintDoc();
      },
      focusSearch,
      focusAnswers,
      openPalette: () => setPaletteOpen(true),
    },
    isDesktop
  );

  /* ============ render ============ */

  const navItems = (
    <>
      <button
        type="button"
        className="nav-item"
        aria-pressed={view === "create"}
        onClick={() => setView("create")}
      >
        <Icon d={ICON_CREATE} /> สร้างงาน
      </button>
      <button
        type="button"
        className="nav-item"
        aria-pressed={view === "queue"}
        onClick={() => setView("queue")}
      >
        <Icon d={ICON_QUEUE} /> คิวตรวจ
        {pendingCount > 0 && <span className="nav-count">{pendingCount}</span>}
      </button>
      <button
        type="button"
        className="nav-item"
        aria-pressed={view === "docs"}
        onClick={() => setView("docs")}
      >
        <Icon d={ICON_DOCS} /> เอกสาร
      </button>
      <Link href="/roster" className="nav-item">
        รายชื่อนักเรียน
      </Link>
      <Link href="/exams" className="nav-item">
        คลังข้อสอบ
      </Link>
      <Link href="/attendance" className="nav-item">
        เช็คชื่อ/มาเรียน
      </Link>
      <Link href="/knowledge" className="nav-item">
        คลังความรู้
      </Link>
      <Link href="/parent" className="nav-item">
        สื่อสารผู้ปกครอง
      </Link>
      <Link href="/chat" className="nav-item">
        แชทกับผู้ช่วย
      </Link>
      <Link href="/notifications" className="nav-item">
        ศูนย์แจ้งเตือน
      </Link>
    </>
  );

  const draftActions = (d: Draft) => (
    <>
      {(d.status === "pending" || d.status === "quarantined") && (
        <>
          <Button
            size="sm"
            loading={busyId === d.id}
            success={flashId === d.id}
            onSuccessDone={() => setFlashId(null)}
            onClick={() => setDraftStatus(d.id, "approved")}
          >
            อนุมัติ
          </Button>
          <Button
            size="sm"
            variant="danger"
            loading={busyId === d.id}
            onClick={() => handleReject(d)}
          >
            ปฏิเสธ
          </Button>
        </>
      )}
      {d.status === "approved" && (
        <Button
          size="sm"
          variant="secondary"
          onClick={() => {
            setDocPrefill({
              type:
                d.agent === "lesson-plan"
                  ? "lesson-record"
                  : d.agent === "reporting"
                  ? "official-letter"
                  : "worksheet",
              content: d.output,
            });
            goDocs();
          }}
          title="สร้างเอกสารจากร่างนี้ (ใบงาน/บันทึกหลังสอน/หนังสือราชการ)"
        >
          📄 ทำเป็นเอกสาร
        </Button>
      )}
      <span className="spacer" />
      <button
        type="button"
        className="btn btn-secondary btn-sm"
        onClick={() => {
          const result = speak(d.output);
          if (result.error) pushToast("error", result.error);
        }}
        title="อ่านผลลัพธ์ออกเสียง (TTS)"
      >
        🔊 อ่านให้ฟัง
      </button>
      {d.status === "approved" && d.agent === "reporting" && (
        <button
          type="button"
          className="btn btn-secondary btn-sm"
          onClick={() => setLinePreviewId(linePreviewId === d.id ? null : d.id)}
          title="ดูตัวอย่างข้อความ LINE OA"
        >
          💬 ดูตัวอย่าง LINE
        </button>
      )}
      <button
        type="button"
        className="btn btn-secondary btn-sm"
        onClick={() => handleCopy(d)}
        title="คัดลอกผลลัพธ์"
      >
        <Icon d={ICON_COPY} size={14} /> คัดลอก
      </button>
      <button
        type="button"
        className="btn btn-secondary btn-sm"
        onClick={() => handleCopyLine(d)}
        title="จัดรูปแบบให้เหมาะกับ LINE แล้วคัดลอก"
      >
        <Icon d={ICON_SEND} size={14} /> LINE
      </button>
      <button
        type="button"
        className="btn btn-secondary btn-sm"
        onClick={() => downloadDraft(d)}
        title="ดาวน์โหลดเป็นไฟล์ .txt"
      >
        <Icon d={ICON_DOWNLOAD} size={14} /> ดาวน์โหลด
      </button>
    </>
  );

  const draftBadge = (d: Draft) => (
    <span
      className={`badge ${
        d.status === "pending"
          ? "badge-pending"
          : d.status === "approved"
          ? "badge-approved"
          : d.status === "quarantined"
          ? "badge-quarantined"
          : "badge-rejected"
      }`}
    >
      {d.status === "pending"
        ? "รออนุมัติ"
        : d.status === "approved"
        ? "อนุมัติแล้ว"
        : d.status === "quarantined"
        ? "กักกัน (ตรวจ PII)"
        : "ปฏิเสธ"}
    </span>
  );

  const guardrailBadge = (d: Draft) => (
    <span
      className="guardrail-badges"
      title={d.warnings.length > 0 ? d.warnings.join("\n") : "ทุกผลลัพธ์ผ่านการตรวจอัตโนมัติก่อนถึงครู"}
    >
      {guardrailTags(d.warnings).map((t) => (
        <span key={t.label} className={`badge badge-guardrail-${t.tone}`}>
          {t.tone === "ok" ? "✓" : t.tone === "pii" ? "⚠" : "⚠"} {t.label}
        </span>
      ))}
    </span>
  );

  // feature 4: voice input — fills the active agent's input field
  const handleVoiceInput = async () => {
    setVoiceBusy(true);
    const result = await listenOnce();
    setVoiceBusy(false);
    if (result.transcript) {
      if (agent === "grading") setInput((prev) => (prev ? `${prev}\n${result.transcript}` : result.transcript ?? ""));
      else if (agent === "lesson-plan") setTopic(result.transcript);
      else if (agent === "reporting") setSummary(result.transcript);
      pushToast("success", "ได้ยินเสียงแล้ว: " + result.transcript);
    } else if (result.error) {
      pushToast("error", result.error);
    }
  };

  // feature 10: OCR upload mock — reads the file name and fills a mock
  // extraction (real OCR would call the backend /api/ocr endpoint)
  const handleOcrUpload = (file: File | undefined) => {
    if (!file) return;
    const name = file.name.replace(/\.[^.]+$/, "");
    setInput(
      `[OCR สาธิต] อ่านจากไฟล์ "${name}" แล้ว:\nคำตอบนักเรียน (ตัวอย่าง): 2+2=4 เพราะเรานับนิ้วรวมกันได้ 4\nคำตอบนักเรียน (ตัวอย่าง): 5 x 8 = 40 เพราะ 5 x 4 = 20 แล้วคูณสอง`
    );
    pushToast("success", `OCR สาธิต: อ่านข้อความจาก "${file.name}" แล้ว (${Math.max(1, Math.round(file.size / 1024))} KB)`);
  };

  // feature 33: deterministic mock cost per draft (real billing reads agent_runs)
  const mockCost = (d: Draft): string => {
    const base = d.agent === "grading" ? 0.03 : d.agent === "lesson-plan" ? 0.05 : 0.04;
    const jitter = (d.id.length * 7) % 10 / 100;
    return `฿${(base + jitter).toFixed(2)}`;
  };

  // feature 3: inline LINE OA preview for approved reporting drafts
  const linePreviewFor = (d: Draft) => (
    <div
      style={{
        marginTop: 10,
        padding: 12,
        borderRadius: 10,
        background: "#f0f7ff",
        border: "1px solid #cfe3ff",
        whiteSpace: "pre-wrap",
        fontSize: "0.85rem",
      }}
    >
      [LINE OA — Solven]
      {"\n"}ถึง ผู้ปกครอง
      {"\n\n"}
      {d.output}
      {"\n\n"}— ข้อความนี้สร้างโดย Solven (ตัวอย่าง)
    </div>
  );

  // feature 13: teacher star rating (persisted via lib/feedback)
  const rateDraft = (d: Draft, stars: number) => {
    setRatings((prev) => ({ ...prev, [d.id]: stars }));
    saveRating({ draftId: d.id, stars, comment: "", createdAt: new Date().toISOString() });
    pushToast("success", `บันทึกคะแนนคุณภาพ ${stars}/5 แล้ว`);
  };

  const ratingRow = (d: Draft) => {
    const current = ratings[d.id] ?? 0;
    return (
      <div className="draft-rating" style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 8 }}>
        <span className="field-hint">คุณภาพ:</span>
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            aria-label={`ให้ ${n} ดาว`}
            onClick={() => rateDraft(d, n)}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              fontSize: 18,
              color: n <= current ? "#f59e0b" : "#d1d5db",
              padding: 0,
            }}
          >
            ★
          </button>
        ))}
        <span className="badge badge-pending" title="คะแนนคุณภาพอัตโนมัติ (LLM-judge สาธิต)">
          AI: {localJudge(d.output).score}/100 · {localJudge(d.output).verdict}
        </span>
        <span className="field-hint" title="ค่าใช้จ่ายโดยประมาณของงานนี้ (โหมดสาธิต)">
          ค่าใช้จ่าย {mockCost(d)}
        </span>
      </div>
    );
  };

  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="sidebar-brand">
          <span className="logo">S</span>
          <span className="brand-name">Solven</span>
        </div>
        <nav className="sidebar-nav" aria-label="ส่วนหลัก">{navItems}</nav>
        <div className="sidebar-foot">
          {queuedCount > 0 && (
            <span
              className="badge badge-pending"
              title="งานที่ถูกบันทึกไว้ตอนออฟไลน์ จะส่งอัตโนมัติเมื่อกลับมาออนไลน์"
            >
              {queuedCount} รอส่ง (ออฟไลน์)
            </span>
          )}
          <span className="engine-badge" title="เครื่องมือที่ทำงานอยู่เบื้องหลัง">
            <span className={`engine-dot ${engine ? "on" : ""}`} />
            {engine ? (engine === "backend" ? "Solven backend" : "mock ในเครื่อง") : "กำลังเชื่อมต่อ..."}
          </span>
          <span className="kbd-hint">
            <kbd>⌘K</kbd> คำสั่งลัด
          </span>
          <Link href="/settings" className="sidebar-link">
            ตั้งค่าโรงเรียน
          </Link>
          <Link href="/about" className="sidebar-link">
            เกี่ยวกับโปรเจกต์
          </Link>
        </div>
      </aside>

      <div className="main-col">
        <nav className="mobile-nav" aria-label="ส่วนหลัก">{navItems}</nav>

        <header className="topbar">
          <div>
            <h1 className="page-title">{VIEW_TITLES[view].title}</h1>
            <p className="page-sub">{VIEW_TITLES[view].sub}</p>
          </div>
          <div className="topbar-actions">
            {isDesktop && (
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => setPaletteOpen(true)}
                title="คำสั่งลัด (⌘K / Ctrl+K)"
              >
                <kbd style={{ fontFamily: "inherit" }}>⌘K</kbd>
              </button>
            )}
            <ProfileMenu />
          </div>
        </header>

        {!isOnline && (
          <div className="offline-banner" role="status" aria-live="polite">
            <span className="offline-dot" aria-hidden="true" />
            ออฟไลน์ —{" "}
            {queuedCount > 0
              ? `${queuedCount} งานจะส่งอัตโนมัติเมื่อมีสัญญาณ`
              : "งานใหม่จะถูกบันทึกในเครื่องและส่งอัตโนมัติเมื่อมีสัญญาณ"}
          </div>
        )}

        <main className="content view-in" key={view}>
          {view === "create" && (
            <form onSubmit={handleSubmit}>
              <div className="panel panel-pad" style={{ marginBottom: 14 }}>
                <h2 className="section-title">เลือกงานที่อยากให้ช่วย</h2>
                <p className="section-hint" style={{ marginBottom: 14 }}>
                  ทุกผลลัพธ์เป็นร่าง — ครูตรวจและอนุมัติทุกครั้ง
                </p>
                <div className="agent-grid">
                  {AGENT_OPTIONS.map((a) => (
                    <button
                      key={a}
                      type="button"
                      className="agent-card"
                      aria-pressed={agent === a}
                      onClick={() => {
                        setAgent(a);
                        setFormError("");
                      }}
                    >
                      <span className="agent-icon">
                        <Icon d={ICONS[a]} size={19} />
                      </span>
                      <span className="agent-name">{AGENT_LABEL[a]}</span>
                      <span className="agent-desc">{AGENT_DESC[a]}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="panel panel-pad" style={{ marginBottom: 14 }}>
                {agent === "grading" && (
                  <>
                    <div className="preset-row" style={{ marginBottom: 16 }}>
                      <div className="field" style={{ marginBottom: 0 }}>
                        <label className="field-label" htmlFor="preset-select">
                          Rubric สำเร็จรูป
                        </label>
                        <select
                          id="preset-select"
                          className="select"
                          onChange={(e) => applyPreset(e.target.value)}
                          defaultValue=""
                        >
                          <option value="">— เลือกหรือพิมพ์เองด้านล่าง —</option>
                          {presets.map((p) => (
                            <option key={p.name} value={p.name}>
                              {p.name}
                            </option>
                          ))}
                        </select>
                      </div>
                      <Button type="button" variant="secondary" onClick={requestDeletePreset}>
                        ลบ
                      </Button>
                    </div>

                    <div className="field">
                      <label className="field-label" htmlFor="rubric">
                        Rubric / เกณฑ์ที่ครูตั้ง
                      </label>
                      <textarea
                        id="rubric"
                        className="textarea"
                        style={{ minHeight: 62 }}
                        value={rubric}
                        onChange={(e) => setRubric(e.target.value)}
                        placeholder={DEFAULT_PRESET.text}
                      />
                      <div className="preset-row" style={{ marginTop: 8 }}>
                        <input
                          id="preset-name"
                          className="input"
                          placeholder="ชื่อ rubric ที่จะบันทึก (เช่น วิชาไทย ม.2)"
                          value={presetName}
                          onChange={(e) => setPresetName(e.target.value)}
                          style={{ maxWidth: 320 }}
                        />
                        <Button type="button" variant="ghost" size="sm" onClick={savePreset}>
                          บันทึกเป็น rubric สำเร็จรูป
                        </Button>
                      </div>
                    </div>

                    <div className="field">
                      <label className="field-label" htmlFor="answers">
                        คำตอบนักเรียน <span style={{ color: "var(--danger)" }}>*</span>
                      </label>
                      <textarea
                        id="answers"
                        className="textarea"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        placeholder={AGENT_HINTS.grading}
                      />
                      <span className="field-hint">
                        แยกคำตอบแต่ละคนด้วยการขึ้นบรรทัดใหม่ — ระบบจะสร้างร่างแยกให้ทุกคน (ทีละคนตามลำดับ)
                      </span>
                      <div style={{ marginTop: 8 }}>
                        <label className="btn btn-secondary btn-sm" style={{ cursor: "pointer", display: "inline-flex" }}>
                          📷 อัปโหลดรูปคำตอบ (OCR สาธิต)
                          <input
                            type="file"
                            accept="image/*"
                            style={{ display: "none" }}
                            onChange={(e) => handleOcrUpload(e.target.files?.[0])}
                          />
                        </label>
                        <span className="field-hint" style={{ marginLeft: 8 }}>
                          สาธิต: อ่านชื่อไฟล์แล้วเติมข้อความตัวอย่าง (จริง: เรียก /api/ocr)
                        </span>
                      </div>
                    </div>
                  </>
                )}

                {agent === "lesson-plan" && (
                  <>
                    <div className="field">
                      <label className="field-label" htmlFor="topic">
                        หัวข้อ / ตัวชี้วัด <span style={{ color: "var(--danger)" }}>*</span>
                      </label>
                      <input
                        id="topic"
                        className="input"
                        value={topic}
                        onChange={(e) => setTopic(e.target.value)}
                        placeholder={AGENT_HINTS["lesson-plan"]}
                      />
                    </div>
                    <div className="form-grid">
                      <div className="field">
                        <label className="field-label" htmlFor="grade">
                          ระดับชั้น
                        </label>
                        <select id="grade" className="select" value={grade} onChange={(e) => setGrade(e.target.value)}>
                          {GRADE_OPTIONS.map((g) => (
                            <option key={g} value={g}>
                              {g}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="field">
                        <label className="field-label" htmlFor="students">
                          จำนวนนักเรียน
                        </label>
                        <input
                          id="students"
                          className="input"
                          type="number"
                          min={1}
                          max={200}
                          value={students}
                          onChange={(e) => setStudents(e.target.value)}
                        />
                      </div>
                    </div>
                    <div className="field">
                      <label className="field-label" htmlFor="duration">
                        เวลาที่มี
                      </label>
                      <select id="duration" className="select" value={duration} onChange={(e) => setDuration(e.target.value)}>
                        {DURATIONS.map((d) => (
                          <option key={d} value={d}>
                            {d}
                          </option>
                        ))}
                      </select>
                    </div>
                  </>
                )}

                {agent === "reporting" && (
                  <>
                    <div className="field">
                      <span className="field-label">ส่งถึงใคร</span>
                      <div className="chip-row">
                        {RECIPIENTS.map((r) => (
                          <button
                            key={r}
                            type="button"
                            className="chip"
                            aria-pressed={recipient === r}
                            onClick={() => setRecipient(r)}
                          >
                            {r}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="field">
                      <span className="field-label">น้ำเสียง</span>
                      <div className="chip-row">
                        {TONES.map((t) => (
                          <button
                            key={t}
                            type="button"
                            className="chip"
                            aria-pressed={tone === t}
                            onClick={() => setTone(t)}
                          >
                            {t}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="field">
                      <label className="field-label" htmlFor="summary">
                        สรุปความก้าวหน้าที่จะร่าง <span style={{ color: "var(--danger)" }}>*</span>
                      </label>
                      <textarea
                        id="summary"
                        className="textarea"
                        value={summary}
                        onChange={(e) => setSummary(e.target.value)}
                        placeholder={AGENT_HINTS.reporting}
                      />
                    </div>
                  </>
                )}

<div style={{ display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
                  <Button
                    type="submit"
                    size="full"
                    loading={submitting}
                    disabled={!canSubmit}
                  >
                    {submitting
                      ? progress
                        ? `กำลังสร้างร่าง... ${progress.done}/${progress.total}`
                        : "กำลังส่ง..."
                      : agent === "grading"
                      ? `ส่งให้ Coordinator${splitAnswers(input).length > 1 ? ` (${splitAnswers(input).length} คน)` : ""}`
                      : "ส่งให้ Coordinator"}
                  </Button>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={handleVoiceInput}
                    disabled={voiceBusy}
                    title="พิมพ์ด้วยเสียง (Web Speech API)"
                  >
                    {voiceBusy ? "🎤 ฟังอยู่..." : "🎤 พิมพ์ด้วยเสียง"}
                  </button>
                </div>
                {formError && (
                  <p role="alert" style={{ color: "var(--danger)", fontSize: "0.82rem", marginTop: 10 }}>
                    {formError}
                  </p>
                )}
                {engine && (
                  <p style={{ fontSize: "0.76rem", color: "var(--muted)", marginTop: 8 }}>
                    {engine === "backend"
                      ? "✓ ทำงานผ่าน Solven backend (FastAPI + LangGraph)"
                      : "• ทำงานผ่าน mock ในเครื่อง — ดู README วิธีเปิด backend"}
                  </p>
                )}
              </div>
            </form>
          )}

          {view === "queue" && (
            <section>
              <div className="panel" style={{ marginBottom: 12, padding: "6px 0" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 12px 0" }}>
                  <span className="field-label" style={{ fontSize: "0.72rem" }}>กิจกรรม 7 วันล่าสุด</span>
                </div>
                <div className="activity-bars" aria-label="จำนวนงานที่สร้างใน 7 วัน">
                  {(() => {
                    const days: { label: string; count: number; isToday: boolean }[] = [];
                    for (let i = 6; i >= 0; i--) {
                      const d = new Date();
                      d.setDate(d.getDate() - i);
                      const key = d.toDateString();
                      const count = drafts.filter((x) => new Date(x.createdAt).toDateString() === key).length;
                      days.push({
                        label: d.toLocaleDateString("th-TH", { weekday: "short" }),
                        count,
                        isToday: i === 0,
                      });
                    }
                    const max = Math.max(1, ...days.map((x) => x.count));
                    return days.map((day, i) => (
                      <div className="activity-col" key={i} title={`${day.count} รายการ`}>
                        <span className="activity-day">{day.count}</span>
                        <div
                          className="activity-bar"
                          data-active={day.isToday}
                          style={{ height: `${Math.max(2, (day.count / max) * 100)}%` }}
                        />
                        <span className="activity-day">{day.label}</span>
                      </div>
                    ));
                  })()}
                </div>
              </div>
              <div className="stats-row" aria-label="สรุปสถานะ">
                <div className="stat stat-blue">
                  <div className="stat-num">
                    <CountUp to={pendingCount} duration={0.7} />
                  </div>
                  <div className="stat-label">รออนุมัติ</div>
                </div>
                <div className="stat stat-ok">
                  <div className="stat-num">
                    <CountUp to={approvedCount} duration={0.7} />
                  </div>
                  <div className="stat-label">อนุมัติแล้ว</div>
                </div>
                <div className="stat stat-danger">
                  <div className="stat-num">
                    <CountUp to={rejectedCount} duration={0.7} />
                  </div>
                  <div className="stat-label">ปฏิเสธ</div>
                </div>
                <div className="stat">
                  <div className="stat-num">
                    <CountUp to={drafts.length} duration={0.7} />
                  </div>
                  <div className="stat-label">ทั้งหมด</div>
                </div>
              </div>

              <div className="filters">
                <div className="agent-strip">
                  <button
                    type="button"
                    className="agent-strip-chip"
                    aria-pressed={agentFilter === "all"}
                    onClick={() => setAgentFilter("all")}
                  >
                    ทุกงาน <span className="agent-strip-count">{drafts.length}</span>
                  </button>
                  {AGENT_OPTIONS.map((a) => {
                    const count = drafts.filter(
                      (d) => d.agent === a && (d.status === "pending" || d.status === "quarantined")
                    ).length;
                    return (
                      <button
                        key={a}
                        type="button"
                        className="agent-strip-chip"
                        aria-pressed={agentFilter === a}
                        onClick={() => setAgentFilter(agentFilter === a ? "all" : a)}
                      >
                        {AGENT_LABEL[a]} <span className="agent-strip-count">{count}</span>
                      </button>
                    );
                  })}
                </div>
                <div className="chip-row">
                  {(["all", "pending", "approved", "rejected", "quarantined"] as StatusFilter[]).map((s) => (
                    <button
                      key={s}
                      type="button"
                      className="chip"
                      aria-pressed={statusFilter === s}
                      onClick={() => setStatusFilter(s)}
                    >
                      {s === "all"
                        ? "ทั้งหมด"
                        : s === "pending"
                        ? "รออนุมัติ"
                        : s === "approved"
                        ? "อนุมัติแล้ว"
                        : s === "quarantined"
                        ? "กักกัน"
                        : "ปฏิเสธ"}
                    </button>
                  ))}
                </div>
                <select
                  className="select"
                  style={{ width: "auto", minWidth: 150 }}
                  aria-label="กรองตามงาน"
                  value={agentFilter}
                  onChange={(e) => setAgentFilter(e.target.value as "all" | AgentType)}
                >
                  <option value="all">ทุกงาน</option>
                  {AGENT_OPTIONS.map((a) => (
                    <option key={a} value={a}>
                      {AGENT_LABEL[a]}
                    </option>
                  ))}
                </select>
                <select
                  className="select sort-select"
                  aria-label="เรียงลำดับ"
                  value={sort}
                  onChange={(e) => setSort(e.target.value as SortOrder)}
                >
                  <option value="newest">ใหม่สุด</option>
                  <option value="oldest">เก่าสุด</option>
                  <option value="agent">งาน A-Z</option>
                </select>
                <input
                  className="input"
                  aria-label="ค้นหา"
                  placeholder="ค้นหาจากผลลัพธ์หรือข้อมูลต้นทาง..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
                <span className="result-count" aria-live="polite">
                  แสดง {sorted.length} จาก {drafts.length} รายการ
                </span>
                {approvedCount > 0 && (
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={exportApproved}
                    title="ดาวน์โหลดงานที่อนุมัติแล้วเป็นไฟล์ .md"
                  >
                    ส่งออกที่อนุมัติ ({approvedCount})
                  </Button>
                )}
              </div>

              {pendingCount > 0 && (
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                  <Checkbox
                    checked={selection.allSelected}
                    indeterminate={selection.indeterminate}
                    onChange={() => selection.toggleAll(visiblePendingIds)}
                    label="เลือกทั้งหมด (เฉพาะรายการที่แสดง)"
                  />
                  <span style={{ fontSize: "0.76rem", color: "var(--muted)" }}>
                    เลือกทั้งหมด ({visiblePendingIds.length} รายการที่แสดง)
                  </span>
                </div>
              )}

              {selection.count > 0 && (
                <div className="bulk-bar" role="status">
                  <span className="bulk-count">เลือก {selection.count} รายการ</span>
                  <Button
                    size="sm"
                    loading={bulkBusy}
                    disabled={selection.count === 0}
                    onClick={() => handleBatch("approved")}
                  >
                    อนุมัติทั้งหมด
                  </Button>
                  <Button
                    size="sm"
                    variant="danger"
                    loading={bulkBusy}
                    disabled={selection.count === 0}
                    onClick={() => handleBatch("rejected")}
                  >
                    ปฏิเสธทั้งหมด
                  </Button>
                  <Button size="sm" variant="ghost" disabled={bulkBusy} onClick={selection.clear}>
                    ยกเลิก
                  </Button>
                </div>
              )}

              {draftsLoading ? (
                <div className="draft-list">
                  <div className="panel skeleton skeleton-card" />
                  <div className="panel skeleton skeleton-card" />
                  <div className="panel skeleton skeleton-card" />
                </div>
              ) : draftsError ? (
                <div className="empty">
                  <div className="empty-icon">⚠️</div>
                  <div className="empty-title">โหลดคิวไม่สำเร็จ</div>
                  <p className="empty-text">{draftsError} — ตรวจสอบว่า backend/เซิร์ฟเวอร์ทำงานอยู่</p>
                  <Button size="sm" onClick={loadDrafts}>
                    ลองใหม่
                  </Button>
                </div>
              ) : drafts.length === 0 ? (
                <div className="empty">
                  <div className="empty-icon">🗂️</div>
                  <div className="empty-title">ยังไม่มีร่างในคิว</div>
                  <p className="empty-text">
                    ส่งงานแรกจากเมนู “สร้างงาน” — ตรวจงาน แผนการสอน หรือรายงาน
                    ผลลัพธ์จะมาปรากฏที่นี่เพื่อให้ครูตรวจและอนุมัติ
                  </p>
                  <div style={{ display: "flex", gap: 8, justifyContent: "center", flexWrap: "wrap" }}>
                    <Button size="sm" onClick={() => setView("create")}>
                      สร้างงานแรก
                    </Button>
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={seedDemoData}
                      loading={submitting}
                      title="สร้างงานตัวอย่างสมมติ (ไม่มีข้อมูลนักเรียนจริง — PDPA)"
                    >
                      {submitting ? "กำลังโหลด..." : "โหลดข้อมูลตัวอย่าง"}
                    </Button>
                  </div>
                </div>
              ) : sorted.length === 0 ? (
                <div className="empty">
                  <div className="empty-icon">🔍</div>
                  <div className="empty-title">ไม่พบรายการที่ตรงเงื่อนไข</div>
                  <p className="empty-text">ลองเปลี่ยนตัวกรองหรือล้างคำค้นหา</p>
                  <Button size="sm" variant="secondary" onClick={resetFilters}>
                    ล้างตัวกรอง
                  </Button>
                </div>
              ) : (
                <div className="draft-list">
                  {sorted.map((d) => (
                    <article className="panel draft" key={d.id}>
                      <div className="draft-head">
                        <div className="draft-meta">
                          <Checkbox
                            checked={selection.selected.has(d.id)}
                            disabled={d.status !== "pending"}
                            onChange={() => selection.toggle(d.id)}
                            label={`เลือก ${AGENT_LABEL[d.agent]} ${fmtTime(d.createdAt)}`}
                          />
                          <span className="agent-tag">{AGENT_LABEL[d.agent]}</span>
                          <span className="draft-time">{fmtTime(d.createdAt)}</span>
                        </div>
                        <span className="draft-head-right">
                          {guardrailBadge(d)}
                          {draftBadge(d)}
                        </span>
                      </div>
                      <div
                        className="draft-out"
                        style={isMobile && d.status === "pending" ? { cursor: "pointer" } : undefined}
                        onClick={isMobile ? () => setDrawerDraft(d) : undefined}
                        title={isMobile ? "แตะเพื่อรีวิวในแผง" : undefined}
                      >
                        {d.output}
                      </div>
                      {d.warnings.length > 0 && (
                        <ul className="warnings">
                          {d.warnings.map((w, i) => (
                            <li key={i}>⚠ {w}</li>
                          ))}
                        </ul>
                      )}
                      {ratingRow(d)}
                      {linePreviewId === d.id && linePreviewFor(d)}
                      <div className="draft-actions">{draftActions(d)}</div>
                    </article>
                  ))}
                </div>
              )}
            </section>
          )}

          {view === "docs" && (
            <section>
              <div className="panel panel-pad" style={{ marginBottom: 14 }}>
                <h2 className="section-title">เลือกแบบฟอร์มเอกสาร</h2>
                <p className="section-hint" style={{ marginBottom: 14 }}>
                  ทุกแบบใช้หัวเอกสารจากหน้า “ตั้งค่าโรงเรียน” — พิมพ์ได้ทันที แม้ออฟไลน์
                </p>
                <div className="docs-grid">
                  {(Object.keys(DOC_TYPE_LABEL) as DocType[]).map((t) => (
                    <button
                      key={t}
                      type="button"
                      className="agent-card"
                      aria-pressed={docType === t}
                      onClick={() => setDocType(t)}
                    >
                      <span className="agent-name">{DOC_TYPE_LABEL[t]}</span>
                      <span className="agent-desc">
                        {t === "summary"
                          ? `พิมพ์งานที่อนุมัติแล้วทั้งหมด (${approvedDrafts.length} รายการ)`
                          : t === "certificate"
                          ? "A4 แนวนอน พร้อมกรอบและช่องลงชื่อผู้อำนวยการ"
                          : "A4 ตั้ง พร้อมหัวเอกสารราชการ"}
                      </span>
                    </button>
                  ))}
                </div>
                <Link href="/settings" className="sidebar-link">
                  ⚙ ตั้งค่าโรงเรียน (ชื่อ/ที่อยู่/ครูผู้สอน)
                </Link>
              </div>

              <div className="panel panel-pad" style={{ marginBottom: 14 }}>
                <h2 className="section-title">ข้อมูลเอกสาร</h2>
                {docType !== "summary" && docSourceDrafts.length > 0 && (
                  <div className="field" style={{ marginBottom: 14 }}>
                    <label className="field-label" htmlFor="doc-source">
                      ดึงจากร่างที่อนุมัติแล้ว
                    </label>
                    <select
                      id="doc-source"
                      className="select"
                      value={docSourceId}
                      onChange={(e) => applyDocSource(e.target.value)}
                    >
                      <option value="">— เลือกร่างที่อนุมัติแล้ว —</option>
                      {docSourceDrafts.map((d) => (
                        <option key={d.id} value={d.id}>
                          {AGENT_LABEL[d.agent]} · {fmtTime(d.createdAt)}
                        </option>
                      ))}
                    </select>
                    <span className="field-hint">เนื้อหาจะถูกแทรกเข้าฟิลด์ที่ตรงกันอัตโนมัติ</span>
                  </div>
                )}

                {docType === "worksheet" && (
                  <div
                    className="form-grid"
                    style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}
                  >
                    <div className="field">
                      <label className="field-label" htmlFor="ws-number">ใบงานที่</label>
                      <input id="ws-number" className="input" value={docFields.number} onChange={(e) => setDoc("number", e.target.value)} />
                    </div>
                    <div className="field">
                      <label className="field-label" htmlFor="ws-subject">วิชา</label>
                      <input id="ws-subject" className="input" value={docFields.subject} onChange={(e) => setDoc("subject", e.target.value)} />
                    </div>
                    <div className="field">
                      <label className="field-label" htmlFor="ws-grade">ชั้น</label>
                      <input id="ws-grade" className="input" value={docFields.grade} onChange={(e) => setDoc("grade", e.target.value)} />
                    </div>
                    <div className="field">
                      <label className="field-label" htmlFor="ws-date">วันที่</label>
                      <input id="ws-date" className="input" value={docFields.date} onChange={(e) => setDoc("date", e.target.value)} />
                    </div>
                  </div>
                )}

                {docType === "worksheet" && (
                  <>
                    <div className="field">
                      <label className="field-label" htmlFor="ws-instructions">คำชี้แจง</label>
                      <textarea
                        id="ws-instructions"
                        className="textarea"
                        style={{ minHeight: 54 }}
                        value={docFields.instructions}
                        onChange={(e) => setDoc("instructions", e.target.value)}
                        placeholder="จงตอบคำถามต่อไปนี้"
                      />
                    </div>
                    <div className="field">
                      <label className="field-label" htmlFor="ws-body">เนื้อหา / โจทย์</label>
                      <textarea
                        id="ws-body"
                        className="textarea"
                        style={{ minHeight: 140 }}
                        value={docFields.body}
                        onChange={(e) => setDoc("body", e.target.value)}
                      />
                    </div>
                  </>
                )}

                {docType === "lesson-record" && (
                  <div
                    className="form-grid"
                    style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}
                  >
                    {([
                      ["lr-subject", "subject", "วิชา"],
                      ["lr-unit", "unit", "หน่วยการเรียนรู้"],
                      ["lr-grade", "grade", "ชั้น"],
                      ["lr-students", "students", "จำนวนนักเรียน"],
                      ["lr-date", "date", "วันที่สอน"],
                    ] as const).map(([id, key, label]) => (
                      <div className="field" key={id}>
                        <label className="field-label" htmlFor={id}>{label}</label>
                        <input id={id} className="input" value={docFields[key]} onChange={(e) => setDoc(key, e.target.value)} />
                      </div>
                    ))}
                  </div>
                )}
                {docType === "lesson-record" && (
                  <>
                    {([
                      ["lr-indicators", "indicators", "มาตรฐาน / ตัวชี้วัด"],
                      ["lr-results", "results", "ผลที่เกิดขึ้นจริง"],
                      ["lr-problems", "problems", "ปัญหา / อุปสรรค"],
                      ["lr-fixes", "fixes", "แนวทางแก้ไข / พัฒนา"],
                    ] as const).map(([id, key, label]) => (
                      <div className="field" key={id}>
                        <label className="field-label" htmlFor={id}>{label}</label>
                        <textarea id={id} className="textarea" style={{ minHeight: 64 }} value={docFields[key]} onChange={(e) => setDoc(key, e.target.value)} />
                      </div>
                    ))}
                  </>
                )}

                {docType === "official-letter" && (
                  <div
                    className="form-grid"
                    style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}
                  >
                    <div className="field">
                      <label className="field-label" htmlFor="ol-ref">ที่</label>
                      <input id="ol-ref" className="input" value={docFields.refNo} onChange={(e) => setDoc("refNo", e.target.value)} placeholder={school.refNo} />
                    </div>
                    <div className="field">
                      <label className="field-label" htmlFor="ol-date">วันที่</label>
                      <input id="ol-date" className="input" value={docFields.date} onChange={(e) => setDoc("date", e.target.value)} />
                    </div>
                    <div className="field">
                      <label className="field-label" htmlFor="ol-subject">เรื่อง</label>
                      <input id="ol-subject" className="input" value={docFields.letterSubject} onChange={(e) => setDoc("letterSubject", e.target.value)} />
                    </div>
                    <div className="field">
                      <label className="field-label" htmlFor="ol-to">เรียน</label>
                      <input id="ol-to" className="input" value={docFields.to} onChange={(e) => setDoc("to", e.target.value)} />
                    </div>
                  </div>
                )}
                {docType === "official-letter" && (
                  <div className="field">
                    <label className="field-label" htmlFor="ol-body">เนื้อหา</label>
                    <textarea
                      id="ol-body"
                      className="textarea"
                      style={{ minHeight: 140 }}
                      value={docFields.body}
                      onChange={(e) => setDoc("body", e.target.value)}
                    />
                  </div>
                )}

                {docType === "certificate" && (
                  <div
                    className="form-grid"
                    style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}
                  >
                    <div className="field">
                      <label className="field-label" htmlFor="cf-name">ชื่อนักเรียน</label>
                      <input id="cf-name" className="input" value={docFields.studentName} onChange={(e) => setDoc("studentName", e.target.value)} />
                    </div>
                    <div className="field">
                      <label className="field-label" htmlFor="cf-date">วันที่</label>
                      <input id="cf-date" className="input" value={docFields.date} onChange={(e) => setDoc("date", e.target.value)} />
                    </div>
                  </div>
                )}
                {docType === "certificate" && (
                  <div className="field">
                    <label className="field-label" htmlFor="cf-detail">เนื่องในโอกาส / รายละเอียด</label>
                    <textarea
                      id="cf-detail"
                      className="textarea"
                      style={{ minHeight: 90 }}
                      value={docFields.detail}
                      onChange={(e) => setDoc("detail", e.target.value)}
                      placeholder="เช่น ได้รับรางวัลชนะเลิศการประกวดอ่านทำนองเสนาะ ระดับชั้น ป.5"
                    />
                  </div>
                )}

                {docType === "summary" && (
                  <div className="empty">
                    <div className="empty-icon">📄</div>
                    <div className="empty-title">
                      {approvedDrafts.length > 0
                        ? `จะพิมพ์ ${approvedDrafts.length} รายการที่อนุมัติแล้ว`
                        : "ยังไม่มีงานที่อนุมัติ"}
                    </div>
                    <p className="empty-text">
                      {approvedDrafts.length > 0
                        ? "รายงานสรุปจะเรียงตามเวลาที่สร้าง พร้อมหัวเอกสารจากตั้งค่าโรงเรียน"
                        : "ไปอนุมัติงานในคิวตรวจก่อน — จากนั้นกลับมาพิมพ์สรุปได้ที่นี่"}
                    </p>
                  </div>
                )}

                {docType === "pp5" && (
                  <div
                    className="form-grid"
                    style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}
                  >
                    <div className="field">
                      <label className="field-label" htmlFor="pp5-name">ชื่อนักเรียน</label>
                      <input id="pp5-name" className="input" value={docFields.studentName} onChange={(e) => setDoc("studentName", e.target.value)} />
                    </div>
                    <div className="field">
                      <label className="field-label" htmlFor="pp5-grade">ชั้น</label>
                      <input id="pp5-grade" className="input" value={docFields.grade} onChange={(e) => setDoc("grade", e.target.value)} />
                    </div>
                  </div>
                )}
                {docType === "pp5" && (
                  <div className="field">
                    <label className="field-label" htmlFor="pp5-subjects">
                      รายวิชา (บรรทัดละวิชา: ชื่อวิชา, คะแนน, ผลการเรียน)
                    </label>
                    <textarea
                      id="pp5-subjects"
                      className="textarea"
                      style={{ minHeight: 120 }}
                      value={docFields.subjectsText}
                      onChange={(e) => setDoc("subjectsText", e.target.value)}
                      placeholder={"คณิตศาสตร์, 85, 4\nภาษาไทย, 78, 3.5\nวิทยาศาสตร์, 90, 4"}
                    />
                  </div>
                )}

                {docType === "pp6" && (
                  <div
                    className="form-grid"
                    style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}
                  >
                    <div className="field">
                      <label className="field-label" htmlFor="pp6-name">ชื่อนักเรียน</label>
                      <input id="pp6-name" className="input" value={docFields.studentName} onChange={(e) => setDoc("studentName", e.target.value)} />
                    </div>
                    <div className="field">
                      <label className="field-label" htmlFor="pp6-birth">วันเกิด</label>
                      <input id="pp6-birth" className="input" value={docFields.birthDate} onChange={(e) => setDoc("birthDate", e.target.value)} />
                    </div>
                    <div className="field">
                      <label className="field-label" htmlFor="pp6-grade">ชั้น</label>
                      <input id="pp6-grade" className="input" value={docFields.grade} onChange={(e) => setDoc("grade", e.target.value)} />
                    </div>
                    <div className="field">
                      <label className="field-label" htmlFor="pp6-gpa">เกรดเฉลี่ย (GPA)</label>
                      <input id="pp6-gpa" className="input" value={docFields.gpa} onChange={(e) => setDoc("gpa", e.target.value)} />
                    </div>
                    <div className="field">
                      <label className="field-label" htmlFor="pp6-date">วันที่ออกใบรับรอง</label>
                      <input id="pp6-date" className="input" value={docFields.date} onChange={(e) => setDoc("date", e.target.value)} />
                    </div>
                  </div>
                )}

                {docType === "order" && (
                  <div
                    className="form-grid"
                    style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}
                  >
                    <div className="field">
                      <label className="field-label" htmlFor="od-ref">เลขที่คำสั่ง</label>
                      <input id="od-ref" className="input" value={docFields.refNo} onChange={(e) => setDoc("refNo", e.target.value)} />
                    </div>
                    <div className="field">
                      <label className="field-label" htmlFor="od-date">วันที่</label>
                      <input id="od-date" className="input" value={docFields.date} onChange={(e) => setDoc("date", e.target.value)} />
                    </div>
                    <div className="field">
                      <label className="field-label" htmlFor="od-subject">เรื่อง</label>
                      <input id="od-subject" className="input" value={docFields.letterSubject} onChange={(e) => setDoc("letterSubject", e.target.value)} />
                    </div>
                  </div>
                )}
                {docType === "order" && (
                  <div className="field">
                    <label className="field-label" htmlFor="od-body">เนื้อหาคำสั่ง</label>
                    <textarea
                      id="od-body"
                      className="textarea"
                      style={{ minHeight: 120 }}
                      value={docFields.body}
                      onChange={(e) => setDoc("body", e.target.value)}
                      placeholder="อาศัยอำนาจตามความในมาตรา 39 แห่ง พ.ร.บ.การศึกษาแห่งชาติ..."
                    />
                  </div>
                )}

                {docType === "memo" && (
                  <div
                    className="form-grid"
                    style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}
                  >
                    <div className="field">
                      <label className="field-label" htmlFor="mm-from">จาก</label>
                      <input id="mm-from" className="input" value={docFields.from} onChange={(e) => setDoc("from", e.target.value)} />
                    </div>
                    <div className="field">
                      <label className="field-label" htmlFor="mm-to">ถึง</label>
                      <input id="mm-to" className="input" value={docFields.to} onChange={(e) => setDoc("to", e.target.value)} />
                    </div>
                    <div className="field">
                      <label className="field-label" htmlFor="mm-date">วันที่</label>
                      <input id="mm-date" className="input" value={docFields.date} onChange={(e) => setDoc("date", e.target.value)} />
                    </div>
                    <div className="field">
                      <label className="field-label" htmlFor="mm-subject">เรื่อง</label>
                      <input id="mm-subject" className="input" value={docFields.letterSubject} onChange={(e) => setDoc("letterSubject", e.target.value)} />
                    </div>
                    <div className="field">
                      <label className="field-label" htmlFor="mm-sender">ผู้บันทึก</label>
                      <input id="mm-sender" className="input" value={docFields.senderName} onChange={(e) => setDoc("senderName", e.target.value)} />
                    </div>
                  </div>
                )}
                {docType === "memo" && (
                  <div className="field">
                    <label className="field-label" htmlFor="mm-body">เนื้อหา</label>
                    <textarea
                      id="mm-body"
                      className="textarea"
                      style={{ minHeight: 120 }}
                      value={docFields.body}
                      onChange={(e) => setDoc("body", e.target.value)}
                    />
                  </div>
                )}
              </div>

              <div className="panel panel-pad">
                <h2 className="section-title">ตัวอย่างเอกสาร</h2>
                <div
                  className="panel"
                  style={{
                    whiteSpace: "pre-wrap",
                    fontFamily: "var(--font)",
                    background: "var(--surface-2)",
                    borderRadius: 8,
                    padding: 12,
                    maxHeight: 220,
                    overflow: "auto",
                  }}
                >
                  {docHtml.replace(/<[^>]+>/g, "").slice(0, 400)}
                </div>
                <div style={{ display: "flex", gap: 10, marginTop: 14, flexWrap: "wrap" }}>
                  <Button type="button" onClick={handlePrintDoc}>
                    🖨 พิมพ์ / บันทึก PDF
                  </Button>
                  {hasBackend && (
                    <Button type="button" variant="secondary" onClick={downloadPdf}>
                      ⬇ ดาวน์โหลด PDF (server)
                    </Button>
                  )}
                </div>
                <span className="field-hint" style={{ display: "block", marginTop: 8 }}>
                  พิมพ์จากเบราว์เซอร์ แล้วเลือก “บันทึกเป็น PDF” ได้เช่นกัน — ใช้ได้แม้ออฟไลน์
                </span>
              </div>
            </section>
          )}
        </main>

        <footer className="footer">
          Solven prototype — ข้อมูลทั้งหมดเป็นตัวอย่าง/อยู่ในเครื่องเท่านั้น ไม่มีข้อมูลนักเรียนจริง (PDPA)
          <br />
          JUMP THAILAND 2026 · Empowering Teachers · v0.2.0
          {" · "}
          <Link href="/about" className="footer-link">
            เกี่ยวกับโปรเจกต์
          </Link>
        </footer>
      </div>

      {/* mobile review drawer */}
      <Drawer open={drawerDraft !== null} onClose={() => setDrawerDraft(null)}>
        {drawerDraft && (
          <>
            <div className="draft-meta" style={{ marginBottom: 10 }}>
              <span className="agent-tag">{AGENT_LABEL[drawerDraft.agent]}</span>
              <span className="draft-time">{fmtTime(drawerDraft.createdAt)}</span>
              <span className="draft-head-right">
                {guardrailBadge(drawerDraft)}
                {draftBadge(drawerDraft)}
              </span>
            </div>
            <div className="draft-out">{drawerDraft.output}</div>
            {drawerDraft.warnings.length > 0 && (
              <ul className="warnings">
                {drawerDraft.warnings.map((w, i) => (
                  <li key={i}>⚠ {w}</li>
                ))}
              </ul>
            )}
            <div className="draft-actions" style={{ marginTop: 14 }}>
              {draftActions(drawerDraft)}
              <Button size="sm" variant="ghost" onClick={() => setDrawerDraft(null)}>
                ปิด
              </Button>
            </div>
          </>
        )}
      </Drawer>

      {/* command palette */}
      <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} items={paletteItems} />

      {/* confirm dialogs */}
      <ConfirmDialog
        open={confirm?.kind === "reject"}
        title="ปฏิเสธร่างนี้?"
        danger
        confirmLabel="ปฏิเสธ"
        body={
          confirm?.warnings && confirm.warnings.length > 0 ? (
            <>
              <p style={{ marginBottom: 6 }}>ร่างนี้มีคำเตือนจากระบบ — ต้องการปฏิเสธใช่ไหม?</p>
              <ul className="warnings" style={{ margin: 0 }}>
                {confirm.warnings.map((w, i) => (
                  <li key={i}>⚠ {w}</li>
                ))}
              </ul>
            </>
          ) : (
            <p>ร่างนี้จะถูกทำเครื่องหมายเป็นปฏิเสธ</p>
          )
        }
        onCancel={() => setConfirm(null)}
        onConfirm={() => {
          if (confirm?.id) setDraftStatus(confirm.id, "rejected");
          setConfirm(null);
        }}
      />
      <ConfirmDialog
        open={confirm?.kind === "reject-batch"}
        title={`ปฏิเสธ ${confirm?.count ?? 0} รายการ?`}
        danger
        confirmLabel="ปฏิเสธทั้งหมด"
        body={
          confirm?.warnings && confirm.warnings.length > 0 ? (
            <>
              <p style={{ marginBottom: 6 }}>มีรายการที่มีคำเตือนจากระบบ (ตัวอย่าง):</p>
              <ul className="warnings" style={{ margin: 0 }}>
                {confirm.warnings.map((w, i) => (
                  <li key={i}>⚠ {w}</li>
                ))}
              </ul>
            </>
          ) : undefined
        }
        onCancel={() => setConfirm(null)}
        onConfirm={() => {
          if (confirm?.kind === "reject-batch") {
            const targets = filtered.filter((d) => d.status === "pending" && selection.selected.has(d.id));
            doBatch("rejected", targets);
          }
          setConfirm(null);
        }}
      />
      <ConfirmDialog
        open={confirm?.kind === "delete-preset"}
        title={`ลบ rubric "${confirm?.name ?? ""}"?`}
        danger
        confirmLabel="ลบ"
        body={<p>การลบไม่สามารถเรียกคืนได้ — rubric นี้จะหายจากรายการสำเร็จรูป</p>}
        onCancel={() => setConfirm(null)}
        onConfirm={() => {
          if (confirm?.name) doDeletePreset(confirm.name);
          setConfirm(null);
        }}
      />
    </div>
  );
}
