"use client";

import { useState } from "react";
import Sidebar from "@/components/Sidebar";
import { essayGrade, EssayGradeResult } from "@/lib/ai";

export default function EssayPage() {
  const [text, setText] = useState("");
  const [result, setResult] = useState<EssayGradeResult | null>(null);
  const [grading, setGrading] = useState(false);
  const [error, setError] = useState("");

  const onGrade = async () => {
    if (!text.trim()) {
      setError("กรุณาเขียนเรียงความก่อนตรวจ");
      return;
    }
    setError("");
    setGrading(true);
    try {
      const res = await essayGrade(text);
      setResult(res);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setGrading(false);
    }
  };

  return (
    <div className="shell">
      <Sidebar />
      <div className="main-col">
        <header className="topbar">
          <div>
            <h1 className="page-title">ตรวจเรียงความ</h1>
            <p className="page-sub">
              AI ตรวจเรียงความ (ข้อมูลสมมติ) — ให้คะแนน 4 ด้าน พร้อมข้อเสนอแนะสำหรับครู
            </p>
          </div>
        </header>
        <main className="content view-in">
          <div className="panel panel-pad" style={{ marginBottom: 14 }}>
            <h2 className="section-title">เขียนเรียงความ</h2>
            <textarea
              className="textarea"
              placeholder="วางหรือพิมพ์เรียงความของนักเรียนที่นี่ (ตัวอย่างข้อมูลเท่านั้น)..."
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={8}
              style={{ width: "100%", marginTop: 10 }}
            />
            {error && <p className="section-hint" style={{ color: "#b91c1c", marginTop: 8 }}>{error}</p>}
            <div style={{ display: "flex", gap: 10, marginTop: 10 }}>
              <button type="button" className="btn btn-primary" onClick={onGrade} disabled={grading}>
                {grading ? "กำลังตรวจ..." : "ตรวจ"}
              </button>
              <span className="section-hint" style={{ alignSelf: "center" }}>
                จำนวนตัวอักษร: {text.length}
              </span>
            </div>
          </div>

          {result && (
            <>
              <div className="panel panel-pad" style={{ marginBottom: 14 }}>
                <h2 className="section-title">
                  ผลการตรวจ{" "}
                  <span className={`badge ${result.grade === "ดีเยี่ยม" || result.grade === "ดี" ? "badge-approved" : result.grade === "พอใช้" ? "badge-pending" : "badge"}`}>
                    {result.grade}
                  </span>
                </h2>
                <table className="table" style={{ width: "100%", marginTop: 10 }}>
                  <thead>
                    <tr>
                      <th>ด้าน</th>
                      <th>คะแนน</th>
                      <th>ความเห็น</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.dims.map((d) => (
                      <tr key={d.name}>
                        <td>{d.name}</td>
                        <td>
                          {d.score}/{d.max}
                        </td>
                        <td>{d.comment}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <p className="section-hint" style={{ marginTop: 10 }}>
                  คะแนนรวม: <strong>{result.totalScore}/{result.totalMax}</strong>
                </p>
              </div>
              <div className="panel panel-pad">
                <h2 className="section-title">ข้อเสนอแนะ</h2>
                <ul style={{ margin: "10px 0 0 18px", padding: 0 }}>
                  {result.suggestions.map((s) => (
                    <li key={s} style={{ marginBottom: 6 }}>
                      {s}
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
