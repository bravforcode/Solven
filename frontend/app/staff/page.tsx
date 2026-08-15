"use client";

import { useEffect, useState } from "react";
import Sidebar from "@/components/Sidebar";
import { fetchStaff, Teacher } from "@/lib/staff";
import { downloadCsv } from "@/lib/csv";

export default function StaffPage() {
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");

  useEffect(() => {
    fetchStaff().then((rows) => {
      setTeachers(rows);
      setLoading(false);
    });
  }, []);

  const q = query.trim().toLowerCase();
  const filtered = teachers.filter(
    (t) =>
      !q ||
      t.name.toLowerCase().includes(q) ||
      t.position.toLowerCase().includes(q) ||
      t.academicStanding.toLowerCase().includes(q) ||
      t.subjects.some((s) => s.toLowerCase().includes(q))
  );

  const exportCsv = () => {
    const rows = filtered.map((t: Teacher) => ({
      ชื่อ: t.name,
      ตำแหน่ง: t.position,
      วิทยฐานะ: t.academicStanding,
      "วิชาที่สอน": t.subjects.join(" / "),
      "ชั่วโมงสอน/สัปดาห์": t.workloadHours,
      เบอร์โทร: t.phone,
    }));
    downloadCsv("solven-staff", rows);
  };

  return (
    <div className="shell">
      <Sidebar />
      <div className="main-col">
        <header className="topbar">
          <div>
            <h1 className="page-title">บุคลากร</h1>
            <p className="page-sub">
              ทะเบียนครูและบุคลากรตัวอย่าง (ข้อมูลสมมติ PDPA) — ใช้ติดตามภาระงานและวิทยฐานะ
            </p>
          </div>
          <div className="topbar-actions">
            <button type="button" className="btn btn-secondary btn-sm" onClick={exportCsv}>
              ส่งออก CSV
            </button>
          </div>
        </header>
        <main className="content view-in">
          <div className="panel panel-pad" style={{ marginBottom: 14 }}>
            <input
              className="input"
              placeholder="ค้นหาชื่อ / ตำแหน่ง / วิทยฐานะ / วิชาที่สอน..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              style={{ maxWidth: 400 }}
            />
          </div>
          {loading ? (
            <div className="panel panel-pad">กำลังโหลด...</div>
          ) : (
            <div className="panel panel-pad">
              <table className="table" style={{ width: "100%" }}>
                <thead>
                  <tr>
                    <th>ชื่อ</th>
                    <th>ตำแหน่ง</th>
                    <th>วิทยฐานะ</th>
                    <th>วิชาที่สอน</th>
                    <th>ชั่วโมง/สัปดาห์</th>
                    <th>เบอร์โทร</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((t) => (
                    <tr key={t.id}>
                      <td>{t.name}</td>
                      <td>{t.position}</td>
                      <td>
                        <span className="badge">{t.academicStanding}</span>
                      </td>
                      <td>{t.subjects.join(", ")}</td>
                      <td>{t.workloadHours} ชม.</td>
                      <td>{t.phone}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {filtered.length === 0 && (
                <div className="empty">
                  <div className="empty-icon">🔍</div>
                  <div className="empty-title">ไม่พบบุคลากร</div>
                  <div className="empty-text">ลองเปลี่ยนคำค้นหา</div>
                </div>
              )}
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
