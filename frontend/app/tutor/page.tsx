"use client";

import { useState } from "react";
import Sidebar from "@/components/Sidebar";
import { tutorReply } from "@/lib/ai";

const SUBJECTS = ["คณิตศาสตร์", "วิทยาศาสตร์", "ภาษาไทย", "สังคมศึกษา"];

interface ChatMessage {
  role: "user" | "ai";
  text: string;
}

export default function TutorPage() {
  const [subject, setSubject] = useState(SUBJECTS[0]);
  const [question, setQuestion] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [thinking, setThinking] = useState(false);

  const onSend = async () => {
    const q = question.trim();
    if (!q || thinking) return;
    const userMsg: ChatMessage = { role: "user", text: q };
    setMessages((m) => [...m, userMsg]);
    setQuestion("");
    setThinking(true);
    try {
      const res = await tutorReply(q, subject);
      const aiMsg: ChatMessage = {
        role: "ai",
        text: `${res.reply}\n\n📌 หัวข้อที่เกี่ยวข้อง: ${res.relatedTopic}\n✏️ คำถามฝึกฝน: ${res.practiceQuestion}`,
      };
      setMessages((m) => [...m, aiMsg]);
    } catch {
      setMessages((m) => [
        ...m,
        { role: "ai", text: "ขออภัย เกิดข้อผิดพลาดในการติดต่อระบบ (โหมดสาธิต)" },
      ]);
    } finally {
      setThinking(false);
    }
  };

  return (
    <div className="shell">
      <Sidebar />
      <div className="main-col">
        <header className="topbar">
          <div>
            <h1 className="page-title">AI ติวเตอร์</h1>
            <p className="page-sub">
              ติวเตอร์ AI ตอบคำถามการบ้าน (ข้อมูลสมมติ) — ให้คำอธิบายและคำถามฝึกฝน
            </p>
          </div>
        </header>
        <main className="content view-in">
          <div className="panel panel-pad" style={{ marginBottom: 14 }}>
            <h2 className="section-title">เลือกวิชา</h2>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 10 }}>
              {SUBJECTS.map((s) => (
                <button
                  key={s}
                  type="button"
                  className={`btn btn-sm ${s === subject ? "btn-primary" : "btn-secondary"}`}
                  onClick={() => setSubject(s)}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          <div className="panel panel-pad" style={{ marginBottom: 14, minHeight: 220 }}>
            <h2 className="section-title">บทสนทนา</h2>
            {messages.length === 0 && (
              <p className="section-hint" style={{ marginTop: 10 }}>
                ถามคำถามการบ้านได้เลย เช่น "ช่วยอธิบายเศษส่วนหน่อย" หรือ "วัฏจักรน้ำคืออะไร"
              </p>
            )}
            <div style={{ marginTop: 10 }}>
              {messages.map((m, i) => (
                <div
                  key={i}
                  style={{
                    marginBottom: 10,
                    padding: "8px 12px",
                    borderRadius: 8,
                    background: m.role === "user" ? "var(--accent, #dbeafe)" : "var(--border, #f3f4f6)",
                    whiteSpace: "pre-line",
                    maxWidth: "80%",
                    marginLeft: m.role === "user" ? "auto" : 0,
                  }}
                >
                  {m.text}
                </div>
              ))}
              {thinking && (
                <p className="section-hint" style={{ marginTop: 6 }}>
                  กำลังคิด (สาธิต)...
                </p>
              )}
            </div>
          </div>

          <div className="panel panel-pad">
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              <input
                className="input"
                placeholder="พิมพ์คำถามของคุณ..."
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") onSend();
                }}
                style={{ flex: 1, minWidth: 220 }}
              />
              <button type="button" className="btn btn-primary" onClick={onSend} disabled={thinking || !question.trim()}>
                ส่ง
              </button>
            </div>
          </div>
        </main>
        <footer className="footer">
          Solven prototype — ข้อมูลทั้งหมดเป็นตัวอย่าง/อยู่ในเครื่องเท่านั้น ไม่มีข้อมูลนักเรียนจริง (PDPA)
        </footer>
      </div>
    </div>
  );
}
