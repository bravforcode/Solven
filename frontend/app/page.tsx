"use client";

import { useEffect, useState } from "react";
import { AGENT_LABEL, AgentType, Draft } from "@/lib/types";

const AGENT_OPTIONS: AgentType[] = ["grading", "lesson-plan", "reporting"];

export default function Home() {
  const [agent, setAgent] = useState<AgentType>("grading");
  const [input, setInput] = useState("");
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [submitting, setSubmitting] = useState(false);

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
    try {
      await fetch("/api/coordinator", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ agent, input }),
      });
      setInput("");
      await loadDrafts();
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

  return (
    <main>
      <h1>Solven — Prototype</h1>
      <p className="subtitle">
        Coordinator → Grading &amp; Feedback / Lesson-Plan / Reporting &amp;
        Communication agents. ทุกผลลัพธ์เป็นแค่ร่าง ต้องครูอนุมัติก่อนใช้จริง
        (human-in-the-loop).
      </p>

      <form className="card" onSubmit={handleSubmit}>
        <label htmlFor="agent">Agent</label>
        <select
          id="agent"
          value={agent}
          onChange={(e) => setAgent(e.target.value as AgentType)}
        >
          {AGENT_OPTIONS.map((a) => (
            <option key={a} value={a}>
              {AGENT_LABEL[a]}
            </option>
          ))}
        </select>

        <label htmlFor="input">Input</label>
        <textarea
          id="input"
          placeholder="เช่น คำตอบนักเรียน / หัวข้อบทเรียน / สรุปความก้าวหน้าที่จะส่งผู้ปกครอง"
          value={input}
          onChange={(e) => setInput(e.target.value)}
        />

        <button type="submit" disabled={submitting}>
          {submitting ? "กำลังส่งให้ agent..." : "ส่งให้ Coordinator"}
        </button>
      </form>

      <h2>Review Queue</h2>
      {drafts.length === 0 && <p className="empty">ยังไม่มีร่างในคิว</p>}
      {drafts.map((d) => (
        <div className="card" key={d.id}>
          <div className="draft-header">
            <strong>{AGENT_LABEL[d.agent]}</strong>
            <span className={`badge ${d.status}`}>{d.status}</span>
          </div>
          <div className="output">{d.output}</div>
          {d.status === "pending" && (
            <div className="actions">
              <button className="ghost" onClick={() => setStatus(d.id, "approved")}>
                Approve
              </button>
              <button
                className="secondary"
                onClick={() => setStatus(d.id, "rejected")}
              >
                Reject
              </button>
            </div>
          )}
        </div>
      ))}
    </main>
  );
}
