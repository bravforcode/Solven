"use client";

import { useEffect, useState } from "react";
import Sidebar from "@/components/Sidebar";
import { downloadCsv } from "@/lib/csv";

interface AttendanceRow {
  className: string;
  present: number;
  absent: number;
  late: number;
  rate: number;
}

interface AttendanceSummary {
  period: string;
  byClass: AttendanceRow[];
  total: AttendanceRow;
  generatedBy: string;
}

const API_URL =
  process.env.SOLVEN_BACKEND_URL ??
  process.env.NEXT_PUBLIC_SOLVEN_API_URL ??
  "http://localhost:8000";

const DEMO_MODE = process.env.NEXT_PUBLIC_SOLVEN_MODE === "demo";

const LOCAL_ATTENDANCE: AttendanceSummary = {
  period: "สัปดาห์นี้",
  byClass: [
    { className: "ป.4/1", present: 47, absent: 3, late: 2, rate: 0.94 },
    { className: "ป.5/1", present: 46, absent: 4, late: 1, rate: 0.92 },
    { className: "ม.1/1", present: 48, absent: 2, late: 3, rate: 0.96 },
  ],
  total: { className: "รวม", present: 141, absent: 9, late: 6, rate: 0.94 },
  generatedBy: "mock-attendance-v1",
};

async function fetchAttendance(): Promise<AttendanceSummary> {
  try {
    const res = await fetch(`${API_URL}/api/demo/attendance`, {
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) throw new Error(`backend ${res.status}`);
    return (await res.json()) as AttendanceSummary;
  } catch {
    if (!DEMO_MODE) throw new Error("backend unreachable");
    return LOCAL_ATTENDANCE;
  }
}

export default function AttendancePage() {
  const [data, setData] = useState<AttendanceSummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAttendance().then((rows) => {
      setData(rows);
      setLoading(false);
    });
  }, []);

  const exportCsv = () => {
    if (!data) return;
    const rows = data.byClass.map((r) => ({
      ชั้น: r.className,
      "มาเรียน": r.present,
      ขาด: r.absent,
      สาย: r.late,
      "อัตราการมาเรียน": `${Math.round(r.rate * 100)}%`,
    }));
    downloadCsv("solven-attendance", rows);
  };

  return (
    <div className="shell">
      <Sidebar />
      <div className="main-col">
        <header className="topbar">
          <div>
            <h1 className="page-title">เช็คชื่อ / มาเรียน</h1>
            <p className="page-sub">
              สรุปการมาเรียนรายห้อง ({data?.period ?? "..."}) — ข้อมูลสมมติ ใช้แสดงรูปแบบรายงานจริง
            </p>
          </div>
          <div className="topbar-actions">
            <button type="button" className="btn btn-secondary btn-sm" onClick={exportCsv}>
              ส่งออก CSV
            </button>
          </div>
        </header>
        <main className="content view-in">
          {loading || !data ? (
            <div className="panel panel-pad">กำลังโหลด...</div>
          ) : (
            <>
              <div className="panel panel-pad" style={{ marginBottom: 14 }}>
                <h2 className="section-title">สรุปภาพรวม</h2>
                <div style={{ display: "flex", gap: 24, flexWrap: "wrap", marginTop: 10 }}>
                  <div>
                    <div className="page-title" style={{ fontSize: 28 }}>{data.total.present}</div>
                    <span className="field-hint">มาเรียน</span>
                  </div>
                  <div>
                    <div className="page-title" style={{ fontSize: 28 }}>{data.total.absent}</div>
                    <span className="field-hint">ขาด</span>
                  </div>
                  <div>
                    <div className="page-title" style={{ fontSize: 28 }}>{data.total.late}</div>
                    <span className="field-hint">สาย</span>
                  </div>
                  <div>
                    <div className="page-title" style={{ fontSize: 28 }}>{Math.round(data.total.rate * 100)}%</div>
                    <span className="field-hint">อัตราการมาเรียน</span>
                  </div>
                </div>
              </div>
              <div className="panel panel-pad">
                <h2 className="section-title">รายห้อง</h2>
                <table className="table" style={{ width: "100%", marginTop: 10 }}>
                  <thead>
                    <tr>
                      <th>ชั้น</th>
                      <th>มาเรียน</th>
                      <th>ขาด</th>
                      <th>สาย</th>
                      <th>อัตราการมาเรียน</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.byClass.map((r) => (
                      <tr key={r.className}>
                        <td>{r.className}</td>
                        <td>{r.present}</td>
                        <td>{r.absent}</td>
                        <td>{r.late}</td>
                        <td>{Math.round(r.rate * 100)}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <p className="section-hint" style={{ marginTop: 10 }}>
                  สร้างโดย {data.generatedBy} — ข้อมูลสมมติ (PDPA)
                </p>
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