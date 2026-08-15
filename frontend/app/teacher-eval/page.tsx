"use client";

import { useEffect, useState } from "react";
import Sidebar from "@/components/Sidebar";
import { fetchTeacherEval, TeacherEval } from "@/lib/staff";

function levelOf(total: number): string {
  if (total >= 90) return "ดีเด่น";
  if (total >= 75) return "ดี";
  if (total >= 60) return "พอใช้";
  return "ปรับปรุง";
}

function levelBadge(level: string): string {
  if (level === "ดีเด่น") return "badge badge-approved";
  if (level === "ดี") return "badge";
  return "badge badge-pending";
}

export default function TeacherEvalPage() {
  const [evalData, setEvalData] = useState<TeacherEval | null>(null);
  const [scores, setScores] = useState<Record<string, number>>({});
  const [checked, setChecked] = useState<Record<string, boolean>>({});
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetchTeacherEval().then((data) => {
      setEvalData(data);
      const s: Record<string, number> = {};
      const c: Record<string, boolean> = {};
      data.criteria.forEach((crit) => {
        s[crit.id] = crit.selfScore;
        c[`${crit.id}:0`] = true;
      });
      setScores(s);
      setChecked(c);
    });
  }, []);

  if (!evalData) {
    return (
      <div className="shell">
        <Sidebar />
        <div className="main-col">
          <header className="topbar">
            <div>
              <h1 className="page-title">ประเมิน ว.PA</h1>
              <p className="page-sub">กำลังโหลด...</p>
            </div>
          </header>
          <main className="content view-in">
            <div className="panel panel-pad">กำลังโหลด...</div>
          </main>
          <footer className="footer">
            Solven prototype — ข้อมูลทั้งหมดเป็นตัวอย่าง/อยู่ในเครื่องเท่านั้น ไม่มีข้อมูลนักเรียนจริง (PDPA)
          </footer>
        </div>
      </div>
    );
  }

  const setScore = (id: string, value: string) => {
    const n = Math.min(100, Math.max(0, parseInt(value, 10) || 0));
    setScores((prev) => ({ ...prev, [id]: n }));
    setSaved(false);
  };

  const total = evalData.criteria.reduce(
    (sum, c) => sum + c.weightPct * ((scores[c.id] ?? c.selfScore) / 100),
    0
  );
  const level = levelOf(total);

  const evidenceCount = (id: string) =>
    evalData.criteria.find((c) => c.id === id)?.evidence.length ?? 0;
  const checkedCount = (id: string) =>
    evalData.criteria.find((c) => c.id === id)?.evidence.filter((_, i) =>
      checked[`${id}:${i}`]
    ).length ?? 0;

  return (
    <div className="shell">
      <Sidebar />
      <div className="main-col">
        <header className="topbar">
          <div>
            <h1 className="page-title">ประเมิน ว.PA</h1>
            <p className="page-sub">
              แบบประเมินผลการปฏิบัติงานตาม ว.PA ของ {evalData.teacher.name} (ตัวอย่าง PDPA)
            </p>
          </div>
        </header>
        <main className="content view-in">
          <div className="panel panel-pad" style={{ marginBottom: 14 }}>
            <h2 className="section-title">เกณฑ์การประเมิน</h2>
            <table className="table" style={{ width: "100%", marginTop: 10 }}>
              <thead>
                <tr>
                  <th>ด้าน</th>
                  <th>น้ำหนัก</th>
                  <th>คะแนนตนเอง (0–100)</th>
                  <th>หลักฐานประกอบ</th>
                </tr>
              </thead>
              <tbody>
                {evalData.criteria.map((c) => (
                  <tr key={c.id}>
                    <td>{c.name}</td>
                    <td>{c.weightPct}%</td>
                    <td>
                      <input
                        type="number"
                        min={0}
                        max={100}
                        className="input"
                        value={scores[c.id] ?? c.selfScore}
                        onChange={(e) => setScore(c.id, e.target.value)}
                        style={{ maxWidth: 90 }}
                      />
                    </td>
                    <td>
                      {c.evidence.map((ev, i) => (
                        <label
                          key={`${c.id}:${i}`}
                          style={{ display: "flex", alignItems: "center", gap: 6 }}
                        >
                          <input
                            type="checkbox"
                            checked={!!checked[`${c.id}:${i}`]}
                            onChange={(e) =>
                              setChecked((prev) => ({
                                ...prev,
                                [`${c.id}:${i}`]: e.target.checked,
                              }))
                            }
                          />
                          <span>{ev}</span>
                        </label>
                      ))}
                      <span className="section-hint">
                        หลักฐาน {checkedCount(c.id)}/{evidenceCount(c.id)} รายการ
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="panel panel-pad" style={{ marginBottom: 14 }}>
            <h2 className="section-title">ผลรวมการประเมิน</h2>
            <p style={{ fontSize: 28, fontWeight: 700, margin: "8px 0" }}>
              {total.toFixed(1)} / 100
            </p>
            <span className={levelBadge(level)}>{level}</span>
            <p className="section-hint">
              คำนวณจากน้ำหนัก × คะแนนตนเองของแต่ละด้าน (แก้คะแนนได้สดๆ)
            </p>
          </div>
          <div className="panel panel-pad">
            <button
              type="button"
              className="btn btn-primary btn-sm"
              onClick={() => setSaved(true)}
            >
              บันทึกการประเมิน
            </button>
            {saved && (
              <p className="section-hint" style={{ marginTop: 10 }}>
                ✓ บันทึกการประเมินแล้ว (ตัวอย่าง — ข้อมูลเก็บเฉพาะในเครื่อง)
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
