"use client";

import { useState } from "react";
import Sidebar from "@/components/Sidebar";
import { useToast } from "@/components/ui/ToastProvider";

interface LinePreview {
  recipient: string;
  message: string;
  preview: string;
  status: string;
  sent: boolean;
  generatedBy: string;
}

const API_URL =
  process.env.SOLVEN_BACKEND_URL ??
  process.env.NEXT_PUBLIC_SOLVEN_API_URL ??
  "http://localhost:8000";

const DEMO_MODE = process.env.NEXT_PUBLIC_SOLVEN_MODE === "demo";

function localLinePreview(text: string, recipient: string): LinePreview {
  return {
    recipient,
    message: text,
    preview: `[LINE OA — Solven]\nถึง ${recipient}\n\n${text}\n\n— ข้อความนี้สร้างโดย Solven (ตัวอย่าง)`,
    status: "ready_for_approval",
    sent: false,
    generatedBy: "mock-line-preview-v1",
  };
}

async function fetchLinePreview(text: string, recipient: string): Promise<LinePreview> {
  try {
    const res = await fetch(`${API_URL}/api/demo/line-preview`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal: AbortSignal.timeout(8000),
      body: JSON.stringify({ text, recipient }),
    });
    if (!res.ok) throw new Error(`backend ${res.status}`);
    return (await res.json()) as LinePreview;
  } catch {
    if (!DEMO_MODE) throw new Error("backend unreachable");
    return localLinePreview(text, recipient);
  }
}

const TEMPLATES = [
  "ด.ช.สมชายมีความก้าวหน้าด้านการอ่านหนังสืออย่างชัดเจน และส่งงานตรงเวลามากขึ้น ขอขอบคุณผู้ปกครองที่สนับสนุน",
  "ด.ญ.สมหญิงกล้าแสดงออกมากขึ้นและเข้าร่วมกิจกรรมของห้องอย่างสม่ำเสมอ เป็นที่ชื่นชมของเพื่อนและครู",
  "ขอเชิญผู้ปกครองเข้าร่วมประชุมผู้ปกครอง ภาคเรียนที่ 1/2569 ในวันเสาร์ที่ 5 กันยายน 2569 เวลา 09:00 น. ณ ห้องประชุมโรงเรียน",
];

export default function ParentPage() {
  const { push } = useToast();
  const [recipient, setRecipient] = useState("ผู้ปกครอง");
  const [text, setText] = useState(TEMPLATES[0]);
  const [preview, setPreview] = useState<LinePreview | null>(null);
  const [sent, setSent] = useState(false);

  const onPreview = async () => {
    if (!text.trim()) {
      push("error", "กรุณาพิมพ์ข้อความก่อน");
      return;
    }
    try {
      setPreview(await fetchLinePreview(text, recipient));
      setSent(false);
    } catch (err) {
      push("error", err instanceof Error ? err.message : String(err));
    }
  };

  const onSend = () => {
    setSent(true);
    push("success", "ส่งข้อความแล้ว (โหมดสาธิต — ไม่ได้ส่งจริง)");
  };

  return (
    <div className="shell">
      <Sidebar />
      <div className="main-col">
        <header className="topbar">
          <div>
            <h1 className="page-title">สื่อสารผู้ปกครอง</h1>
            <p className="page-sub">
              ร่างข้อความแจ้งผู้ปกครอง + ตัวอย่างหน้าตา LINE OA — ครูตรวจและกดส่งเองทุกครั้ง (human-in-the-loop)
            </p>
          </div>
        </header>
        <main className="content view-in">
          <div className="panel panel-pad" style={{ marginBottom: 14 }}>
            <h2 className="section-title">ร่างข้อความ</h2>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", margin: "10px 0" }}>
              {TEMPLATES.map((t) => (
                <button key={t.slice(0, 12)} type="button" className="btn btn-secondary btn-sm" onClick={() => setText(t)}>
                  ตัวอย่าง {TEMPLATES.indexOf(t) + 1}
                </button>
              ))}
            </div>
            <input
              className="input"
              value={recipient}
              onChange={(e) => setRecipient(e.target.value)}
              placeholder="ผู้รับ เช่น ผู้ปกครองนักเรียนชั้น ป.5/1"
              style={{ maxWidth: 320, marginBottom: 10 }}
            />
            <textarea
              className="input"
              rows={4}
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="พิมพ์ข้อความที่จะส่งถึงผู้ปกครอง..."
              style={{ width: "100%" }}
            />
            <div style={{ display: "flex", gap: 10, marginTop: 10 }}>
              <button type="button" className="btn btn-primary" onClick={onPreview}>
                ดูตัวอย่าง LINE
              </button>
              {preview && !sent && (
                <button type="button" className="btn btn-secondary" onClick={onSend}>
                  ส่งข้อความ (สาธิต)
                </button>
              )}
            </div>
          </div>

          {preview && (
            <div className="panel panel-pad">
              <h2 className="section-title">ตัวอย่างข้อความ LINE OA</h2>
              <div style={{ marginTop: 10, padding: 14, borderRadius: 10, background: "#f0f7ff", border: "1px solid #cfe3ff", whiteSpace: "pre-wrap" }}>
                {preview.preview}
              </div>
              <p className="section-hint" style={{ marginTop: 10 }}>
                สถานะ: {sent ? "ส่งแล้ว (สาธิต)" : "รอการอนุมัติจากครู"} · สร้างโดย {preview.generatedBy}
              </p>
            </div>
          )}
        </main>
        <footer className="footer">
          Solven prototype — ข้อมูลทั้งหมดเป็นตัวอย่าง/อยู่ในเครื่องเท่านั้น ไม่มีข้อมูลนักเรียนจริง (PDPA)
        </footer>
      </div>
    </div>
  );
}