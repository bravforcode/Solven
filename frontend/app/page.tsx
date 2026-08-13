"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AGENT_LABEL, AgentType, Draft } from "@/lib/types";
import { enqueueTask, flushQueue, listQueuedTasks, QueuedTask } from "@/lib/offlineQueue";
import CountUp from "@/components/reactbits/CountUp";
import Button from "@/components/ui/Button";
import Checkbox from "@/components/ui/Checkbox";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import CommandPalette from "@/components/ui/CommandPalette";
import Drawer from "@/components/ui/Drawer";
import { useToast, ToastType, ToastOptions } from "@/components/ui/ToastProvider";
import { buildCommands, CommandItem } from "@/lib/commands";
import { useSelection, useShortcuts, useMediaQuery } from "@/lib/hooks";
import { applyBatch, patchDraftStatus } from "@/lib/drafts";

/* ============ types & constants ============ */

type View = "create" | "queue";
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
    input: "ผู้รับ: ผู้ปกครอง\nน้ำเสียง: สุภาพ เป็นทางการ\nสรุปความก้าวหน้าของนักเรียน: อ่านหนังสือคล่องขึ้น ส่งงานตรงเวลามากขึ้น",
  },
];

const VIEW_TITLES: Record<View, { title: string; sub: string }> = {
  create: { title: "สร้างงาน", sub: "เลือกงานที่อยากให้ช่วย — ผลลัพธ์ทุกชิ้นเป็นร่างที่ครูต้องอนุมัติ" },
  queue: { title: "คิวตรวจ", sub: "ตรวจสอบและอนุมัติร่างที่ agent สร้างให้ — ทุกชิ้นต้องผ่านครู" },
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
const ICON_COPY =
  "M8 8h12a1 1 0 011 1v12a1 1 0 01-1 1H8a1 1 0 01-1-1V9a1 1 0 011-1z M16 8V4a1 1 0 00-1-1H4a1 1 0 00-1 1v12a1 1 0 001 1h4";
const ICON_DOWNLOAD =
  "M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4 M7 10l5 5 5-5 M12 15V3";

/* ============ app ============ */

export default function Home() {
  const [view, setView] = useState<View>("create");
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [draftsLoading, setDraftsLoading] = useState(true);
  const [draftsError, setDraftsError] = useState("");
  const [engine, setEngine] = useState<string>("");
  const [queuedCount, setQueuedCount] = useState(0);

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
    window.addEventListener("online", flushOfflineQueue);
    const onSwMessage = (e: MessageEvent) => {
      if (e.data?.type === "solven-sync-flushed") {
        loadDrafts();
        refreshQueuedCount();
      }
    };
    navigator.serviceWorker?.addEventListener?.("message", onSwMessage);
    return () => {
      window.removeEventListener("online", flushOfflineQueue);
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
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
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
      if (!updated) throw new Error("HTTP");
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

  /* ----- convenience: demo data + export ----- */
  async function seedDemoData() {
    if (submitting) return;
    setSubmitting(true);
    let created = 0;
    try {
      for (const task of DEMO_TASKS) {
        const res = await fetch("/api/coordinator", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(task),
        });
        if (res.ok) created++;
      }
      await loadDrafts();
      pushToast(
        created > 0 ? "success" : "error",
        created > 0
          ? `โหลดข้อมูลตัวอย่างแล้ว ${created} รายการ — ทุกชิ้นเป็นข้อมูลสมมติ ตรวจและอนุมัติได้เลย`
          : "โหลดข้อมูลตัวอย่างไม่สำเร็จ — ตรวจ backend ก่อน"
      );
      setView("queue");
    } catch (err) {
      pushToast("error", `โหลดข้อมูลตัวอย่างล้มเหลว: ${err instanceof Error ? err.message : err}`);
    } finally {
      setSubmitting(false);
    }
  }

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
  const pendingCount = drafts.filter((d) => d.status === "pending").length;
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

  const selection = useSelection(
    filtered.map((d) => d.id),
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
        setStatusFilter: (s) => setStatusFilter(s),
        setAgentFilter: (a) => setAgentFilter(a),
        resetFilters,
        seedDemo: () => {
          setView("queue");
          seedDemoData();
        },
      }),
    [resetFilters]
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
    </>
  );

  const draftActions = (d: Draft) => (
    <>
      {d.status === "pending" && (
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
      <span className="spacer" />
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
          : "badge-rejected"
      }`}
    >
      {d.status === "pending"
        ? "รออนุมัติ"
        : d.status === "approved"
        ? "อนุมัติแล้ว"
        : "ปฏิเสธ"}
    </span>
  );

  const visiblePendingIds = sorted.filter((d) => d.status === "pending").map((d) => d.id);

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
          <span>v0.2.0 · JUMP THAILAND 2026</span>
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
            <span className="avatar" title="ผู้ใช้ (ตัวอย่าง)" aria-hidden="true">
              ท
            </span>
          </div>
        </header>

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
                <div className="chip-row">
                  {(["all", "pending", "approved", "rejected"] as StatusFilter[]).map((s) => (
                    <button
                      key={s}
                      type="button"
                      className="chip"
                      aria-pressed={statusFilter === s}
                      onClick={() => setStatusFilter(s)}
                    >
                      {s === "all" ? "ทั้งหมด" : s === "pending" ? "รออนุมัติ" : s === "approved" ? "อนุมัติแล้ว" : "ปฏิเสธ"}
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
                <div className="bulk-bar">
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
                        {draftBadge(d)}
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
                      <div className="draft-actions">{draftActions(d)}</div>
                    </article>
                  ))}
                </div>
              )}
            </section>
          )}
        </main>

        <footer className="footer">
          Solven prototype — ข้อมูลทั้งหมดเป็นตัวอย่าง/อยู่ในเครื่องเท่านั้น ไม่มีข้อมูลนักเรียนจริง (PDPA)
          <br />
          JUMP THAILAND 2026 · Empowering Teachers
        </footer>
      </div>

      {/* mobile review drawer */}
      <Drawer open={drawerDraft !== null} onClose={() => setDrawerDraft(null)}>
        {drawerDraft && (
          <>
            <div className="draft-meta" style={{ marginBottom: 10 }}>
              <span className="agent-tag">{AGENT_LABEL[drawerDraft.agent]}</span>
              <span className="draft-time">{fmtTime(drawerDraft.createdAt)}</span>
              {draftBadge(drawerDraft)}
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
