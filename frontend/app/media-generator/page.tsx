"use client";

import { useState } from "react";
import Sidebar from "@/components/Sidebar";
import { generateMedia, MediaResult } from "@/lib/ai";

export default function MediaGeneratorPage() {
  const [topic, setTopic] = useState("");
  const [media, setMedia] = useState<MediaResult | null>(null);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState("");

  const onGenerate = async () => {
    if (!topic.trim()) {
      setError("กรุณากรอกหัวข้อก่อนสร้างสไลด์");
      return;
    }
    setError("");
    setGenerating(true);
    try {
      const res = await generateMedia(topic);
      setMedia(res);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setGenerating(false);
    }
  };

  const downloadTxt = () => {
    if (!media) return;
    const txt = [
      ...media.slides.map(
        (s) => `# ${s.title}\n${s.bullets.map((b) => `- ${b}`).join("\n")}`
      ),
      "\n--- สคริปต์นำเสนอ ---\n" + media.script,
      "\n--- ไอเดียรูปภาพ ---\n" + media.suggestedImages.map((img) => `- ${img}`).join("\n"),
    ].join("\n\n");
    const blob = new Blob([txt], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `solven-slides-${media.topic}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="shell">
      <Sidebar />
      <div className="main-col">
        <header className="topbar">
          <div>
            <h1 className="page-title">AI สร้างสื่อ</h1>
            <p className="page-sub">
              สร้างสไลด์ประกอบการสอนอัตโนมัติ (ข้อมูลสมมติ) — ครูนำไปปรับใช้ต่อได้
            </p>
          </div>
          {media && (
            <div className="topbar-actions">
              <button type="button" className="btn btn-secondary btn-sm" onClick={downloadTxt}>
                ดาวน์โหลด .txt
              </button>
            </div>
          )}
        </header>
        <main className="content view-in">
          <div className="panel panel-pad" style={{ marginBottom: 14 }}>
            <h2 className="section-title">หัวข้อบทเรียน</h2>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 10 }}>
              <input
                className="input"
                placeholder="เช่น วัฏจักรน้ำ วิชาวิทยาศาสตร์ ป.4"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                style={{ maxWidth: 360, flex: 1 }}
              />
              <button type="button" className="btn btn-primary" onClick={onGenerate} disabled={generating}>
                {generating ? "กำลังสร้าง..." : "สร้างสไลด์"}
              </button>
            </div>
            {error && <p className="section-hint" style={{ color: "#b91c1c", marginTop: 8 }}>{error}</p>}
          </div>

          {media && (
            <>
              <div style={{ display: "flex", gap: 14, flexWrap: "wrap", marginBottom: 14 }}>
                {media.slides.map((s, i) => (
                  <div key={s.title} className="panel panel-pad" style={{ flex: "1 1 220px", minWidth: 220 }}>
                    <p className="section-hint" style={{ marginBottom: 4 }}>
                      สไลด์ {i + 1}/4
                    </p>
                    <h2 className="section-title">{s.title}</h2>
                    <ul style={{ margin: "10px 0 0 0", padding: 0 }}>
                      {s.bullets.map((b) => (
                        <li key={b} style={{ listStyle: "none", marginBottom: 6 }}>
                          • {b}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
              <div className="panel panel-pad" style={{ marginBottom: 14 }}>
                <h2 className="section-title">สคริปต์นำเสนอ</h2>
                <p className="section-hint" style={{ whiteSpace: "pre-line", marginTop: 8 }}>
                  {media.script}
                </p>
              </div>
              <div className="panel panel-pad">
                <h2 className="section-title">ไอเดียรูปภาพประกอบ</h2>
                <ul style={{ margin: "10px 0 0 18px", padding: 0 }}>
                  {media.suggestedImages.map((img) => (
                    <li key={img} style={{ marginBottom: 6 }}>
                      {img}
                    </li>
                  ))}
                </ul>
              </div>
            </>
          )}
        </main>
        <footer className="footer">
          Solven prototype — ข้อมูลทั้งหมดเป็นตัวอย่าง/อยู่ในเครื่องเท่านั้น ไม่มีข้อมูลนักเรียนจริง (PDPA)
        </footer>
      </div>
    </div>
  );
}
