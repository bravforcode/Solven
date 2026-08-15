"use client";

import { useEffect, useState } from "react";
import Sidebar from "@/components/Sidebar";
import {
  fetchParentPortal,
  ParentPortalData,
  ParentPortalStudent,
} from "@/lib/student";

export default function PortalPage() {
  const [data, setData] = useState<ParentPortalData>({ students: [] });
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string>("");

  useEffect(() => {
    fetchParentPortal().then((rows) => {
      setData(rows);
      if (rows.students.length > 0) setSelectedId(rows.students[0].id);
      setLoading(false);
    });
  }, []);

  const child = data.students.find((s) => s.id === selectedId) ?? null;

  return (
    <div className="shell">
      <Sidebar />
      <div className="main-col">
        <header className="topbar">
          <div>
            <h1 className="page-title">พอร์ทัลผู้ปกครอง</h1>
            <p className="page-sub">
              ข้อมูลผลการเรียนและการแจ้งเตือนสำหรับผู้ปกครอง (ข้อมูลสมมติ PDPA)
            </p>
          </div>
          <div className="topbar-actions" />
        </header>
        <main className="content view-in">
          <div className="panel panel-pad" style={{ marginBottom: 14 }}>
            <h2 className="section-title">เลือกบุตรหลาน</h2>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 10 }}>
              {data.students.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  className={`btn btn-sm ${s.id === selectedId ? "btn-primary" : "btn-secondary"}`}
                  onClick={() => setSelectedId(s.id)}
                >
                  {s.name} ({s.className})
                </button>
              ))}
            </div>
          </div>

          {loading ? (
            <div className="panel panel-pad">กำลังโหลด...</div>
          ) : child ? (
            <>
              <div className="panel panel-pad" style={{ marginBottom: 14 }}>
                <h2 className="section-title">
                  {child.name}{" "}
                  <span className="field-hint">
                    (ชั้น {child.className} · รหัส {child.id})
                  </span>
                </h2>
                <table className="table" style={{ width: "100%", marginTop: 10 }}>
                  <thead>
                    <tr>
                      <th>วิชา</th>
                      <th>คะแนน</th>
                      <th>ระดับผลการเรียน</th>
                    </tr>
                  </thead>
                  <tbody>
                    {child.grades.map((g) => (
                      <tr key={g.subject}>
                        <td>{g.subject}</td>
                        <td>{g.score}</td>
                        <td>{g.grade}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="panel panel-pad" style={{ marginBottom: 14 }}>
                <h2 className="section-title">สรุปการมาเรียน</h2>
                <div style={{ display: "flex", gap: 24, flexWrap: "wrap", marginTop: 10 }}>
                  <div>
                    <div className="section-hint">มาเรียน</div>
                    <div style={{ fontSize: 22, fontWeight: 700 }}>
                      {child.attendance.present} วัน
                    </div>
                  </div>
                  <div>
                    <div className="section-hint">ขาดเรียน</div>
                    <div style={{ fontSize: 22, fontWeight: 700, color: "#c0392b" }}>
                      {child.attendance.absent} วัน
                    </div>
                  </div>
                  <div>
                    <div className="section-hint">มาสาย</div>
                    <div style={{ fontSize: 22, fontWeight: 700, color: "#b7791f" }}>
                      {child.attendance.late} ครั้ง
                    </div>
                  </div>
                </div>
              </div>

              <div className="panel panel-pad" style={{ marginBottom: 14 }}>
                <h2 className="section-title">การบ้าน</h2>
                <ul style={{ marginTop: 10, paddingLeft: 18 }}>
                  {child.homework.map((h) => (
                    <li key={h.title} style={{ marginBottom: 6 }}>
                      {h.title}{" "}
                      <span
                        className={`badge ${h.status === "ส่งแล้ว" ? "badge-approved" : "badge-pending"}`}
                      >
                        {h.status}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="panel panel-pad">
                <h2 className="section-title">ข้อความจากครูประจำชั้น</h2>
                <ul style={{ marginTop: 10, paddingLeft: 18 }}>
                  {child.teacherNotes.map((n) => (
                    <li key={n} style={{ marginBottom: 6 }}>
                      {n}
                    </li>
                  ))}
                </ul>
              </div>
            </>
          ) : (
            <div className="panel panel-pad">
              <div className="empty">
                <div className="empty-icon">👧</div>
                <div className="empty-title">ไม่พบข้อมูลบุตรหลาน</div>
                <div className="empty-text">ลองเลือกบุตรหลานจากปุ่มด้านบน</div>
              </div>
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
