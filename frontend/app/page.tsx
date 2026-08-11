"use client";

import { useEffect, useState } from "react";
import { AGENT_LABEL, AgentType, Draft } from "@/lib/types";

const AGENT_OPTIONS: AgentType[] = ["grading", "lesson-plan", "reporting"];

const AGENT_HINTS: Record<AgentType, string> = {
  grading: "วางคำตอบ/ผลงานนักเรียน + rubric ที่ครูตั้งเอง",
  "lesson-plan": "หัวข้อบทเรียน / ตัวชี้วัด / จำนวนนักเรียน",
  reporting: "ข้อมูลความก้าวหน้าที่จะสรุปส่งผู้ปกครอง/ผู้บริหาร",
};

export default function Home() {
  const [agent, setAgent] = useState<AgentType>("grading");
  const [input, setInput] = useState("");
  const [rubric, setRubric] = useState("");
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [engine, setEngine] = useState<string>("");
  const [error, setError] = useState<string>("");

  async function loadDrafts() {
    const res = await fetch("/api/drafts");
    setDrafts(await res.json());
  }

  useEffect(() => {
    loadDrafts();
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim()) return;
    setSubmitting(true);
    setError("");
    setEngine("");
    try {
      const res = await fetch("/api/coordinator", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ agent, input, rubric }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "เกิดข้อผิดพลาด");
      } else {
        setEngine(data.engine);
        setInput("");
        setRubric("");
        await loadDrafts();
      }
    } catch {
      setError("ไม่สามารถติดต่อเซิร์ฟเวอร์ได้");
    } finally {
      setSubmitting(false);
    }
  }

  async function setStatus(id: string, status: "approved" | "rejected") {
    await fetch(`/api/drafts/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    await loadDrafts();
  }

  const pendingCount = drafts.filter((d) => d.status === "pending").length;

  return (
    <main>
      <header className="hero">
        <div className="brand">
          <span className="logo">S</span>
          <div>
            <h1>Solven</h1>
            <p className="subtitle">
              ผู้ช่วยครูแบบ multi-agent — คืนเวลาให้ครูได้สอน
            </p>
          </div>
        </div>
        <span className="pill">JUMP THAILAND 2026 · Empowering Teachers</span>
      </header>

      <section className="strip">
        <p>
          ทุกผลลัพธ์เป็น <strong>ร่างเท่านั้น</strong> — ครูตรวจและอนุมัติทุกครั้ง
          (human-in-the-loop) ไม่มี agent ตัวใดตัดสินใจแทนครู
        </p>
      </section>

      <form className="card" onSubmit={handleSubmit}>
        <h2 className="section-title">เลือกงานที่อยากให้ช่วย</h2>
        <div className="agent-grid">
          {AGENT_OPTIONS.map((a) => (
            <button
              key={a}
              type="button"
              className={`agent-card ${agent === a ? "active" : ""}`}
              onClick={() => setAgent(a)}
            >
              <span className="agent-icon">
                {a === "grading" ? "✓" : a === "lesson-plan" ? "▦" : "✉"}
              </span>
              <span className="agent-name">{AGENT_LABEL[a]}</span>
              <span className="agent-hint">{AGENT_HINTS[a]}</span>
            </button>
          ))}
        </div>

        {agent === "grading" && (
          <label>
            Rubric / เกณฑ์ที่ครูตั้ง (ไม่บังคับ)
            <textarea
              value={rubric}
              onChange={(e) => setRubric(e.target.value)}
              placeholder="เช่น ครบประเด็น 3 ข้อ = 3 คะแนน, ภาษาเรียบร้อย = 2 คะแนน"
              className="small"
            />
          </label>
        )}

        <label>
          ข้อมูล / งานที่ส่งให้ agent
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={AGENT_HINTS[agent]}
          />
        </label>

        <div className="form-footer">
          <p className="note">
            {engine &&
              (engine === "backend"
                ? "✓ ทำงานผ่าน Solven backend (FastAPI + LangGraph)"
                : "• ทำงานผ่าน mock ในเครื่อง (ไม่พบ backend — ดู README)")}
            {error && <span className="err">✗ {error}</span>}
          </p>
          <button type="submit" disabled={submitting || !input.trim()}>
            {submitting ? "กำลังส่งให้ coordinator..." : "ส่งให้ Coordinator"}
          </button>
        </div>
      </form>

      <section>
        <div className="queue-head">
          <h2 className="section-title">คิวตรวจของครู</h2>
          <span className={`pill ${pendingCount ? "has" : ""}`}>
            {pendingCount} รออนุมัติ
          </span>
        </div>

        {drafts.length === 0 && (
          <p className="empty">ยังไม่มีร่างในคิว — ส่งงานแรกเลย</p>
        )}

        {drafts.map((d) => (
          <div className="card draft" key={d.id}>
            <div className="draft-header">
              <span className="agent-name small">{AGENT_LABEL[d.agent]}</span>
              <span className={`badge ${d.status}`}>
                {d.status === "pending"
                  ? "รออนุมัติ"
                  : d.status === "approved"
                  ? "อนุมัติแล้ว"
                  : "ปฏิเสธ"}
              </span>
            </div>
            <div className="output">{d.output}</div>
            {d.warnings.length > 0 && (
              <ul className="warnings">
                {d.warnings.map((w, i) => (
                  <li key={i}>⚠ {w}</li>
                ))}
              </ul>
            )}
            {d.status === "pending" && (
              <div className="actions">
                <button
                  className="ghost"
                  onClick={() => setStatus(d.id, "approved")}
                >
                  อนุมัติ
                </button>
                <button
                  className="secondary"
                  onClick={() => setStatus(d.id, "rejected")}
                >
                  ปฏิเสธ
                </button>
              </div>
            )}
            <p className="meta">
              {d.agent} · {new Date(d.createdAt).toLocaleString("th-TH")}
            </p>
          </div>
        ))}
      </section>

      <footer>
        Solven prototype — ข้อมูลทั้งหมดอยู่ในเครื่อง/ตัวอย่างเท่านั้น ไม่มีข้อมูลนักเรียนจริง
        (PDPA)
      </footer>
    </main>
  );
}
