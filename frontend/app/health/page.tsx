"use client";

import { useEffect, useState } from "react";
import Sidebar from "@/components/Sidebar";
import { fetchHealth, HealthRecord } from "@/lib/student";
import { LOCAL_REGISTRY } from "@/lib/student";

const NAME_MAP: Record<string, string> = Object.fromEntries(
  LOCAL_REGISTRY.map((s) => [s.id, s.name])
);

function bmiCategory(bmi: number): { label: string; cls: string } {
  if (bmi < 14.5) return { label: "ต่ำกว่าเกณฑ์", cls: "badge badge-pending" };
  if (bmi <= 22) return { label: "ปกติ", cls: "badge badge-approved" };
  return { label: "เกินเกณฑ์", cls: "badge" };
}

export default function HealthPage() {
  const [records, setRecords] = useState<HealthRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string>("");

  useEffect(() => {
    fetchHealth().then((rows) => {
      setRecords(rows);
      if (rows.length > 0) setSelectedId(rows[0].studentId);
      setLoading(false);
    });
  }, []);

  const studentIds = Array.from(new Set(records.map((r) => r.studentId)));
  const studentRecords = records.filter((r) => r.studentId === selectedId);

  return (
    <div className="shell">
      <Sidebar />
      <div className="main-col">
        <header className="topbar">
          <div>
            <h1 className="page-title">สุขภาพนักเรียน</h1>
            <p className="page-sub">
              บันทึกการเจริญเติบโตและการตรวจสุขภาพประจำภาคเรียน (ข้อมูลสมมติ PDPA)
            </p>
          </div>
          <div className="topbar-actions" />
        </header>
        <main className="content view-in">
          <div className="panel panel-pad" style={{ marginBottom: 14 }}>
            <label className="field-label" htmlFor="health-student">
              เลือกนักเรียน
            </label>
            <select
              id="health-student"
              className="select"
              value={selectedId}
              onChange={(e) => setSelectedId(e.target.value)}
              style={{ maxWidth: 360 }}
            >
              {studentIds.map((id) => (
                <option key={id} value={id}>
                  {NAME_MAP[id] ?? id} ({id})
                </option>
              ))}
            </select>
          </div>

          {loading ? (
            <div className="panel panel-pad">กำลังโหลด...</div>
          ) : studentRecords.length === 0 ? (
            <div className="panel panel-pad">
              <div className="empty">
                <div className="empty-icon">🩺</div>
                <div className="empty-title">ไม่มีบันทึกสุขภาพ</div>
              </div>
            </div>
          ) : (
            <div className="panel panel-pad">
              <h2 className="section-title">
                {NAME_MAP[selectedId] ?? selectedId}{" "}
                <span className="field-hint">(รหัส {selectedId})</span>
              </h2>
              <table className="table" style={{ width: "100%", marginTop: 10 }}>
                <thead>
                  <tr>
                    <th>ภาคเรียน</th>
                    <th>ส่วนสูง (ซม.)</th>
                    <th>น้ำหนัก (กก.)</th>
                    <th>BMI</th>
                    <th>การประเมิน</th>
                    <th>สายตา</th>
                    <th>หมายเหตุ</th>
                  </tr>
                </thead>
                <tbody>
                  {studentRecords.map((r) => {
                    const cat = bmiCategory(r.bmi);
                    return (
                      <tr key={r.term}>
                        <td>{r.term}</td>
                        <td>{r.heightCm}</td>
                        <td>{r.weightKg}</td>
                        <td>{r.bmi}</td>
                        <td>
                          <span className={cat.cls}>{cat.label}</span>
                        </td>
                        <td>{r.vision}</td>
                        <td>{r.note}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
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
