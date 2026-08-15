"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import Sidebar from "@/components/Sidebar";
import { fetchRoster, RosterClass, Student } from "@/lib/roster";
import { downloadCsv } from "@/lib/csv";

export default function RosterPage() {
  const [classes, setClasses] = useState<RosterClass[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");

  useEffect(() => {
    fetchRoster().then((rows) => {
      setClasses(rows);
      setLoading(false);
    });
  }, []);

  const q = query.trim().toLowerCase();
  const filtered = classes
    .map((c) => ({
      ...c,
      students: c.students.filter(
        (s) => !q || s.name.toLowerCase().includes(q) || s.id.toLowerCase().includes(q)
      ),
    }))
    .filter((c) => c.students.length > 0);

  const exportCsv = () => {
    const rows = classes.flatMap((c) =>
      c.students.map((s: Student) => ({
        ชั้น: c.name,
        ห้อง: c.room,
        รหัสนักเรียน: s.id,
        ชื่อ: s.name,
        เพศ: s.gender,
        "เบอร์ผู้ปกครอง": s.parentPhone,
      }))
    );
    downloadCsv("solven-roster", rows);
  };

  return (
    <div className="shell">
      <Sidebar />
      <div className="main-col">
        <header className="topbar">
          <div>
            <h1 className="page-title">รายชื่อนักเรียน</h1>
            <p className="page-sub">
              ทะเบียนนักเรียนตัวอย่าง (ข้อมูลสมมติ PDPA) — ใช้เป็นฐานข้อมูลสำหรับเช็คชื่อและสื่อสารผู้ปกครอง
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
              placeholder="ค้นหาชื่อนักเรียน..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              style={{ maxWidth: 360 }}
            />
          </div>
          {loading ? (
            <div className="panel panel-pad">กำลังโหลด...</div>
          ) : (
            filtered.map((c) => (
              <div className="panel panel-pad" key={c.id} style={{ marginBottom: 14 }}>
                <h2 className="section-title">
                  ชั้น {c.name} <span className="field-hint">({c.room} · ครู{c.teacher})</span>
                </h2>
                <table className="table" style={{ width: "100%", marginTop: 10 }}>
                  <thead>
                    <tr>
                      <th>รหัส</th>
                      <th>ชื่อ</th>
                      <th>เพศ</th>
                      <th>เบอร์ผู้ปกครอง</th>
                    </tr>
                  </thead>
                  <tbody>
                    {c.students.map((s) => (
                      <tr key={s.id}>
                        <td>{s.id}</td>
                        <td>{s.name}</td>
                        <td>{s.gender}</td>
                        <td>{s.parentPhone}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ))
          )}
          <p className="section-hint">
            <Link href="/attendance">→ ไปหน้าเช็คชื่อ/มาเรียน</Link>
          </p>
        </main>
        <footer className="footer">
          Solven prototype — ข้อมูลทั้งหมดเป็นตัวอย่าง/อยู่ในเครื่องเท่านั้น ไม่มีข้อมูลนักเรียนจริง (PDPA)
        </footer>
      </div>
    </div>
  );
}