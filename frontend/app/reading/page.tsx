"use client";

import { useEffect, useState } from "react";
import Sidebar from "@/components/Sidebar";
import { fetchReading, ReadingRecord } from "@/lib/ai";

const fluencyBadge = (f: ReadingRecord["fluency"]) =>
  f === "คล่อง" ? "badge badge-approved" : f === "ปานกลาง" ? "badge badge-pending" : "badge";

export default function ReadingPage() {
  const [records, setRecords] = useState<ReadingRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);

  useEffect(() => {
    fetchReading().then((rows) => {
      setRecords(rows);
      setLoading(false);
    });
  }, []);

  const onRecord = () => {
    if (analyzing) return;
    setAnalyzing(true);
    // Simulate async speech analysis; result is a fixed mock record (no randomness).
    setTimeout(() => {
      setRecords((prev) => [
        ...prev,
        {
          studentId: "s-099",
          name: "เด็กหญิงวิมล ทดสอบเสียง",
          date: new Date().toISOString().slice(0, 10),
          wpm: 118,
          accuracyPct: 96,
          fluency: "คล่อง",
          errors: 3,
        },
      ]);
      setAnalyzing(false);
    }, 1000);
  };

  return (
    <div className="shell">
      <Sidebar />
      <div className="main-col">
        <header className="topbar">
          <div>
            <h1 className="page-title">ประเมินการอ่าน</h1>
            <p className="page-sub">
              วัดความคล่องแคล่วในการอ่าน (คำ/นาที, ความแม่นยำ) — ข้อมูลสมมติเพื่อสาธิต
            </p>
          </div>
          <div className="topbar-actions">
            <button type="button" className="btn btn-primary btn-sm" onClick={onRecord} disabled={analyzing}>
              🎤 บันทึกเสียง
            </button>
          </div>
        </header>
        <main className="content view-in">
          {analyzing && (
            <div className="panel panel-pad" style={{ marginBottom: 14 }}>
              <p className="section-hint">กำลังวิเคราะห์ (สาธิต)...</p>
            </div>
          )}
          <div className="panel panel-pad">
            <h2 className="section-title">ผลการประเมิน ({records.length} รายการ)</h2>
            {loading ? (
              <p className="section-hint">กำลังโหลด...</p>
            ) : (
              <table className="table" style={{ width: "100%", marginTop: 10 }}>
                <thead>
                  <tr>
                    <th>รหัส</th>
                    <th>ชื่อ</th>
                    <th>วันที่</th>
                    <th>ความเร็ว (คำ/นาที)</th>
                    <th>ความแม่นยำ</th>
                    <th>ระดับความคล่อง</th>
                    <th>จุดที่อ่านผิด</th>
                  </tr>
                </thead>
                <tbody>
                  {records.map((r) => (
                    <tr key={r.studentId}>
                      <td>{r.studentId}</td>
                      <td>{r.name}</td>
                      <td>{r.date}</td>
                      <td>{r.wpm}</td>
                      <td>{r.accuracyPct}%</td>
                      <td>
                        <span className={fluencyBadge(r.fluency)}>{r.fluency}</span>
                      </td>
                      <td>{r.errors} จุด</td>
                    </tr>
                  ))}
                </tbody>
              </table>
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
