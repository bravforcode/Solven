"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useReducedMotion } from "motion/react";
import { AGENT_LABEL, AgentType, Draft } from "@/lib/types";
import BorderGlow from "@/components/reactbits/BorderGlow";
import CountUp from "@/components/reactbits/CountUp";
import Particles from "@/components/reactbits/Particles";
import ShinyText from "@/components/reactbits/ShinyText";

/* ============ types & constants ============ */

type View = "create" | "queue";
type StatusFilter = "all" | Draft["status"];
type ToastType = "success" | "error" | "info";

interface Toast {
  id: number;
  type: ToastType;
  text: string;
}

interface RubricPreset {
  name: string;
  text: string;
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
const DEFAULT_PRESET: RubricPreset = {
  name: "ตัวอย่าง: สังคมศึกษา",
  text: "ตอบครบประเด็น 3 ข้อ = 3 คะแนน\nอธิบายเหตุผลประกอบ = 2 คะแนน\nภาษา/การเขียนเรียบร้อย = 1 คะแนน\nรวม 6 คะแนน",
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
    // fallback for older/insecure contexts
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

function Icon({ d, size = 18 }: { d: string; size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
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

const ICON_COPY =
  "M8 8h12a1 1 0 011 1v12a1 1 0 01-1 1H8a1 1 0 01-1-1V9a1 1 0 011-1z M16 8V4a1 1 0 00-1-1H4a1 1 0 00-1 1v12a1 1 0 001 1h4";
const ICON_DOWNLOAD =
  "M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4 M7 10l5 5 5-5 M12 15V3";
const ICON_SEARCH = "M11 19a8 8 0 100-16 8 8 0 000 16z M21 21l-4.35-4.35";

/* ============ app ============ */

export default function Home() {
  const reducedMotion = useReducedMotion();
  const [view, setView] = useState<View>("create");
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [draftsLoading, setDraftsLoading] = useState(true);
  const [draftsError, setDraftsError] = useState("");
  const [engine, setEngine] = useState<string>("");

  // create-form state
  const [agent, setAgent] = useState<AgentType>("grading");
  const [input, setInput] = useState("");
  const [rubric, setRubric] = useState("");
  const [presetName, setPresetName] = useState("");
  const [presets, setPresets] = useState<RubricPreset[]>([]);
  const [topic, setTopic] = useState("");
  const [grade, setGrade] = useState("ป.5");
  const [students, setStudents] = useState("30");
  const [duration, setDuration] = useState(DURATIONS[0]);
  const [recipient, setRecipient] = useState(RECIPIENTS[0]);
  const [tone, setTone] = useState(TONES[0]);
  const [summary, setSummary] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const [formError, setFormError] = useState("");

  // queue state
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [agentFilter, setAgentFilter] = useState<"all" | AgentType>("all");
  const [search, setSearch] = useState("");

  const [toasts, setToasts] = useState<Toast[]>([]);
  const toastId = useRef(0);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  /* ----- toasts ----- */
  const pushToast = useCallback((type: ToastType, text: string) => {
    const id = ++toastId.current;
    setToasts((t) => [...t, { id, type, text }]);
    window.setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 4200);
  }, []);

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
    // reporting
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
    try {
      for (let i = 0; i < payloads.length; i++) {
        setProgress({ done: i, total: payloads.length });
        // via Next.js server route → backend + local review queue stay in sync
        const res = await fetch("/api/coordinator", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payloads[i]),
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
      }
      setEngine(lastEngine);
      if (created > 1) pushToast("success", `สร้างร่าง ${created} รายการแล้ว — ไปตรวจที่คิว`);
      else pushToast("success", "สร้างร่างแล้ว — ไปตรวจที่คิว");
      setInput("");
      setSummary("");
      setRubric("");
      setTopic("");
      await loadDrafts();
      setView("queue");
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setFormError(`ส่งงานล้มเหลว (${msg}) — ลองใหม่`);
      pushToast("error", `ส่งงานล้มเหลว: ${msg}`);
    } finally {
      setSubmitting(false);
      setProgress(null);
    }
  }

  /* ----- review actions ----- */
  async function setDraftStatus(id: string, status: "approved" | "rejected") {
    try {
      const res = await fetch(`/api/drafts/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const updated = (await res.json()) as Draft;
      setDrafts((ds) => ds.map((d) => (d.id === id ? updated : d)));
      pushToast("success", status === "approved" ? "อนุมัติแล้ว" : "ปฏิเสธแล้ว");
    } catch (err) {
      pushToast("error", `ไม่สามารถอัปเดตได้: ${err instanceof Error ? err.message : err}`);
    }
  }

  async function handleCopy(d: Draft) {
    const ok = await copyText(d.output);
    pushToast(ok ? "success" : "error", ok ? "คัดลอกผลลัพธ์แล้ว" : "คัดลอกไม่สำเร็จ");
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

  function deletePreset(name: string) {
    if (name === DEFAULT_PRESET.name) return;
    const next = presets.filter((p) => p.name !== name);
    setPresets(next);
    window.localStorage.setItem(PRESETS_KEY, JSON.stringify(next.filter((p) => p.name !== DEFAULT_PRESET.name)));
    pushToast("info", `ลบ "${name}" แล้ว`);
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

  const canSubmit =
    agent === "grading" ? input.trim().length > 0 :
    agent === "lesson-plan" ? topic.trim().length > 0 :
    summary.trim().length > 0;

  /* ============ render ============ */

  return (
    <div className="app">
      <section className="hero" aria-label="Solven — ผู้ช่วยครู">
        <div className="hero-particles" aria-hidden="true">
          {!reducedMotion && (
            <Particles
              particleCount={70}
              particleSpread={8}
              speed={0.08}
              particleColors={["#bfdbfe", "#93c5fd", "#ffffff"]}
              alphaParticles
              particleBaseSize={60}
              sizeRandomness={0.8}
              disableRotation
            />
          )}
        </div>
        <div className="hero-inner">
          <div className="hero-brand">
            <span className="logo">S</span>
            <div>
              <h1 className="hero-title">
                <ShinyText
                  text="Solven"
                  color="#ffffff"
                  shineColor="#bfdbfe"
                  spread={90}
                  speed={3.5}
                  disabled={!!reducedMotion}
                />
              </h1>
              <p className="hero-tagline">คืนเวลาให้ครูได้สอน</p>
            </div>
          </div>
          <div className="hero-side">
            <span className="engine-badge on-dark" title="เครื่องมือที่ทำงานอยู่เบื้องหลัง">
              <span className={`engine-dot ${engine ? "on" : ""}`} />
              {engine
                ? engine === "backend"
                  ? "Solven backend"
                  : "mock ในเครื่อง"
                : "กำลังเชื่อมต่อ..."}
            </span>
            <span className="hero-hint">ทุกผลลัพธ์เป็นร่าง — ครูตรวจและอนุมัติทุกครั้ง (human-in-the-loop)</span>
          </div>
        </div>
      </section>

      <nav className="tabs" aria-label="ส่วนหลัก" style={{ marginBottom: 18 }}>
        <button
          type="button"
          className="tab"
          aria-pressed={view === "create"}
          onClick={() => setView("create")}
        >
          สร้างงาน
        </button>
        <button
          type="button"
          className="tab"
          aria-pressed={view === "queue"}
          onClick={() => setView("queue")}
        >
          คิวตรวจ
          {pendingCount > 0 && <span className="tab-count">{pendingCount}</span>}
        </button>
      </nav>

      <main className="view-in" key={view}>
        {view === "create" && (
          <form onSubmit={handleSubmit}>
            <div className="panel panel-pad" style={{ marginBottom: 16 }}>
              <h2 className="section-title">เลือกงานที่อยากให้ช่วย</h2>
              <p className="section-hint" style={{ marginBottom: 14 }}>
                ทุกผลลัพธ์เป็นร่าง — ครูตรวจและอนุมัติทุกครั้ง
              </p>
              <div className="agent-grid">
                {AGENT_OPTIONS.map((a) => {
                  const selected = agent === a;
                  const card = (
                    <button
                      type="button"
                      className="agent-card"
                      aria-pressed={selected}
                      onClick={() => {
                        setAgent(a);
                        setFormError("");
                      }}
                    >
                      <span className="agent-icon">
                        <Icon d={ICONS[a]} size={20} />
                      </span>
                      <span className="agent-name">{AGENT_LABEL[a]}</span>
                      <span className="agent-desc">{AGENT_DESC[a]}</span>
                    </button>
                  );
                  return selected && !reducedMotion ? (
                    <BorderGlow
                      key={a}
                      className="agent-glow"
                      backgroundColor="#ffffff"
                      borderRadius={14}
                      glowRadius={14}
                      edgeSensitivity={45}
                      coneSpread={35}
                      fillOpacity={0.22}
                      glowColor="217 91% 60%"
                      colors={["#2563eb", "#3b82f6", "#93c5fd"]}
                    >
                      {card}
                    </BorderGlow>
                  ) : (
                    card
                  );
                })}
              </div>
            </div>

            <div className="panel panel-pad" style={{ marginBottom: 16 }}>
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
                    <button
                      type="button"
                      className="btn btn-secondary"
                      title="ลบ preset ที่เลือก"
                      onClick={() => {
                        const sel = (document.getElementById("preset-select") as HTMLSelectElement)?.value;
                        if (sel) deletePreset(sel);
                      }}
                    >
                      ลบ
                    </button>
                  </div>

                  <div className="field">
                    <label className="field-label" htmlFor="rubric">
                      Rubric / เกณฑ์ที่ครูตั้ง
                    </label>
                    <textarea
                      id="rubric"
                      className="textarea"
                      style={{ minHeight: 64 }}
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
                      <button type="button" className="btn btn-ghost btn-sm" onClick={savePreset}>
                        บันทึกเป็น rubric สำเร็จรูป
                      </button>
                    </div>
                  </div>

                  <div className="field">
                    <label className="field-label" htmlFor="answers">
                      คำตอบนักเรียน <span style={{ color: "var(--danger)" }}>*</span>
                    </label>
                    <textarea
                      id="answers"
                      ref={inputRef}
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
                <button
                  type="submit"
                  className="btn btn-primary btn-full"
                  disabled={submitting || !canSubmit}
                >
                  {submitting
                    ? progress
                      ? `กำลังสร้างร่าง... ${progress.done}/${progress.total}`
                      : "กำลังส่ง..."
                    : agent === "grading"
                    ? `ส่งให้ Coordinator${splitAnswers(input).length > 1 ? ` (${splitAnswers(input).length} คน)` : ""}`
                    : "ส่งให้ Coordinator"}
                </button>
              </div>
              {formError && (
                <p role="alert" style={{ color: "var(--danger)", fontSize: "0.85rem", marginTop: 10 }}>
                  {formError}
                </p>
              )}
              {engine && (
                <p style={{ fontSize: "0.78rem", color: "var(--muted)", marginTop: 8 }}>
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
              <input
                className="input"
                aria-label="ค้นหา"
                placeholder="ค้นหาจากผลลัพธ์หรือข้อมูลต้นทาง..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

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
                <button type="button" className="btn btn-primary btn-sm" onClick={loadDrafts}>
                  ลองใหม่
                </button>
              </div>
            ) : drafts.length === 0 ? (
              <div className="empty">
                <div className="empty-icon">🗂️</div>
                <div className="empty-title">ยังไม่มีร่างในคิว</div>
                <p className="empty-text">
                  ส่งงานแรกจากแท็บ “สร้างงาน” — ตรวจงาน แผนการสอน หรือรายงาน
                  ผลลัพธ์จะมาปรากฏที่นี่เพื่อให้ครูตรวจและอนุมัติ
                </p>
                <button type="button" className="btn btn-primary btn-sm" onClick={() => setView("create")}>
                  สร้างงานแรก
                </button>
              </div>
            ) : filtered.length === 0 ? (
              <div className="empty">
                <div className="empty-icon">🔍</div>
                <div className="empty-title">ไม่พบรายการที่ตรงเงื่อนไข</div>
                <p className="empty-text">ลองเปลี่ยนตัวกรองหรือล้างคำค้นหา</p>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => {
                    setStatusFilter("all");
                    setAgentFilter("all");
                    setSearch("");
                  }}
                >
                  ล้างตัวกรอง
                </button>
              </div>
            ) : (
              <div className="draft-list">
                {filtered.map((d) => (
                  <article className="panel draft" key={d.id}>
                    <div className="draft-head">
                      <div className="draft-meta">
                        <span className="agent-tag">{AGENT_LABEL[d.agent]}</span>
                        <span className="draft-time">{fmtTime(d.createdAt)}</span>
                      </div>
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
                    </div>
                    <div className="draft-out">{d.output}</div>
                    {d.warnings.length > 0 && (
                      <ul className="warnings">
                        {d.warnings.map((w, i) => (
                          <li key={i}>⚠ {w}</li>
                        ))}
                      </ul>
                    )}
                    <div className="draft-actions">
                      {d.status === "pending" && (
                        <>
                          <button
                            type="button"
                            className="btn btn-primary btn-sm"
                            onClick={() => setDraftStatus(d.id, "approved")}
                          >
                            อนุมัติ
                          </button>
                          <button
                            type="button"
                            className="btn btn-danger btn-sm"
                            onClick={() => setDraftStatus(d.id, "rejected")}
                          >
                            ปฏิเสธ
                          </button>
                        </>
                      )}
                      <span className="spacer" />
                      <button
                        type="button"
                        className="btn btn-secondary btn-sm"
                        onClick={() => handleCopy(d)}
                        title="คัดลอกผลลัพธ์"
                      >
                        <Icon d={ICON_COPY} size={15} /> คัดลอก
                      </button>
                      <button
                        type="button"
                        className="btn btn-secondary btn-sm"
                        onClick={() => downloadDraft(d)}
                        title="ดาวน์โหลดเป็นไฟล์ .txt"
                      >
                        <Icon d={ICON_DOWNLOAD} size={15} /> ดาวน์โหลด
                      </button>
                    </div>
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

      <div className="toasts" aria-live="polite">
        {toasts.map((t) => (
          <div key={t.id} className={`toast toast-${t.type}`}>
            <span className="toast-icon">{t.type === "success" ? "✓" : t.type === "error" ? "✕" : "ℹ"}</span>
            <span>{t.text}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
