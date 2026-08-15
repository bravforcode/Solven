"use client";

import { useEffect, useRef, useState } from "react";
import Sidebar from "@/components/Sidebar";
import { listenOnce } from "@/lib/voice";
import { speak, stopSpeaking, ttsSupported } from "@/lib/tts";
import { useToast } from "@/components/ui/ToastProvider";

interface ChatMessage {
  role: "user" | "assistant";
  text: string;
}

const SUGGESTIONS = [
  "ช่วยร่างแผนการสอนวิชาคณิตศาสตร์ ป.5 เรื่องเศษส่วน 60 นาที",
  "ช่วยตรวจคำตอบนักเรียน: 2+2=4 เพราะเรานับนิ้วรวมกันได้ 4",
  "ช่วยร่างรายงานแจ้งผู้ปกครองว่าลูกอ่านหนังสือคล่องขึ้น",
];

function assistantReply(input: string): string {
  const lower = input.toLowerCase();
  if (lower.includes("แผน") || lower.includes("สอน")) {
    return "ร่างแผนการสอน (ตัวอย่าง): 1) นำเข้าบทเรียน 10 นาที 2) กิจกรรมหลัก 35 นาที (จับคู่บวกเศษส่วน) 3) สรุป+วัดผล 15 นาที (แบบฝึกหัดท้ายชั่วโมง) — ตรวจทานก่อนใช้งาน (ร่าง)";
  }
  if (lower.includes("ตรวจ") || lower.includes("คะแนน")) {
    return "คะแนนโดยประมาณ: 4/4 — ครบถ้วน อธิบายเหตุผลได้ถูกต้อง (ร่าง ตรวจทานก่อนใช้งาน)\nจุดเด่น: อธิบายเหตุผลได้ถูกต้อง\nควรปรับปรุง: เขียนเครื่องหมายเท่ากับให้ชัดขึ้น";
  }
  if (lower.includes("รายงาน") || lower.includes("ผู้ปกครอง")) {
    return "รายงาน (ร่าง): ด.ช.ตัวอย่างมีความก้าวหน้าด้านการอ่านหนังสืออย่างชัดเจน และส่งงานตรงเวลามากขึ้น ขอขอบคุณผู้ปกครองที่สนับสนุน — ตรวจทานก่อนส่ง";
  }
  return "รับทราบครับ/ค่ะ (โหมดสาธิต) — ฉันช่วยได้ทั้งตรวจงาน ร่างแผนการสอน ร่างรายงาน และค้นหาคลังความรู้ ลองถามด้วยตัวอย่างด้านบน";
}

export default function ChatPage() {
  const { push } = useToast();
  const [messages, setMessages] = useState<ChatMessage[]>([
    { role: "assistant", text: "สวัสดีครับ/ค่ะ ฉันคือผู้ช่วยครู Solven (โหมดสาธิต) — ถามได้เลย เช่น ช่วยร่างแผนการสอน หรือตรวจคำตอบนักเรียน" },
  ]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [listening, setListening] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const send = (text?: string) => {
    const term = (text ?? input).trim();
    if (!term || busy) return;
    setMessages((prev) => [...prev, { role: "user", text: term }]);
    setInput("");
    setBusy(true);
    setTimeout(() => {
      setMessages((prev) => [...prev, { role: "assistant", text: assistantReply(term) }]);
      setBusy(false);
    }, 600);
  };

  const onVoice = async () => {
    setListening(true);
    const result = await listenOnce();
    setListening(false);
    if (result.transcript) {
      setInput(result.transcript);
      push("success", "ได้ยินเสียงแล้ว: " + result.transcript);
    } else if (result.error) {
      push("error", result.error);
    }
  };

  const onSpeak = (text: string) => {
    const result = speak(text);
    if (result.error) push("error", result.error);
  };

  return (
    <div className="shell">
      <Sidebar />
      <div className="main-col">
        <header className="topbar">
          <div>
            <h1 className="page-title">แชทกับผู้ช่วย</h1>
            <p className="page-sub">
              พิมพ์หรือพูดด้วยเสียง (🎤) — ผู้ช่วยตอบเป็นร่าง ครูตรวจทานก่อนใช้งานทุกครั้ง
            </p>
          </div>
        </header>
        <main className="content view-in">
          <div className="panel panel-pad" style={{ display: "flex", flexDirection: "column", minHeight: "55vh" }}>
            <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: 10 }}>
              {messages.map((m, i) => (
                <div
                  key={i}
                  style={{
                    alignSelf: m.role === "user" ? "flex-end" : "flex-start",
                    maxWidth: "80%",
                    padding: "10px 14px",
                    borderRadius: 12,
                    background: m.role === "user" ? "#2563eb" : "#f3f4f6",
                    color: m.role === "user" ? "#fff" : "inherit",
                    whiteSpace: "pre-wrap",
                  }}
                >
                  {m.text}
                  {m.role === "assistant" && (
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      style={{ marginTop: 8 }}
                      onClick={() => onSpeak(m.text)}
                      title="อ่านออกเสียง"
                    >
                      🔊 อ่านให้ฟัง
                    </button>
                  )}
                </div>
              ))}
              {busy && <div className="section-hint">กำลังพิมพ์...</div>}
              <div ref={bottomRef} />
            </div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", margin: "12px 0" }}>
              {SUGGESTIONS.map((s) => (
                <button key={s.slice(0, 16)} type="button" className="btn btn-secondary btn-sm" onClick={() => send(s)}>
                  {s.slice(0, 40)}...
                </button>
              ))}
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <input
                className="input"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && send()}
                placeholder="พิมพ์คำถาม..."
                style={{ flex: 1 }}
              />
              <button type="button" className="btn btn-secondary" onClick={onVoice} disabled={listening} title="พิมพ์ด้วยเสียง">
                {listening ? "🎤 ฟังอยู่..." : "🎤"}
              </button>
              <button type="button" className="btn btn-primary" onClick={() => send()} disabled={busy}>
                ส่ง
              </button>
            </div>
            {!ttsSupported() && (
              <p className="section-hint" style={{ marginTop: 8 }}>
                เบราว์เซอร์นี้ไม่รองรับการอ่านออกเสียง (ลอง Chrome/Edge)
              </p>
            )}
          </div>
        </main>
        <footer className="footer">
          Solven prototype — ข้อมูลทั้งหมดเป็นตัวอย่าง/อยู่ในเครื่องเท่านั้น ไม่มีข้อมูลนักเรียนจริง (PDPA)
        </footer>
      </div>
    </div>
  );
}