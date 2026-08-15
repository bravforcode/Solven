"use client";

import { useEffect, useState } from "react";
import Sidebar from "@/components/Sidebar";
import { fetchStudentRegistry, RegistryStudent } from "@/lib/student";
import { downloadCsv } from "@/lib/csv";

function statusBadge(status: string) {
  if (status === "กำลังศึกษา") return "badge badge-approved";
  if (status === "ย้ายออก") return "badge badge-pending";
  return "badge";
}

export default function RegistryPage() {
  const [rows, setRows] = useState<RegistryStudent[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");

  useEffect(() => {
    fetchStudentRegistry().then((data) => {
      setRows(data);
      setLoading(false);
    });
  }, []);

  const q = query.trim().toLowerCase();
  const filtered = rows.filter(
    (s) =>
      !q ||
      s.name.toLowerCase().includes(q) ||
      s.id.toLowerCase().includes(q) ||
      s.className.toLowerCase().includes(q) ||
      s.status.toLowerCase().includes(q)
  );

  const exportCsv = () => {
    const csvRows = filtered.map((s) => ({
      รหัส: s.id,
      ชื่อ: s.name,
      "วันเกิด": s.birthDate,
      ชั้น: s.className,
      ผู้ปกครอง: s.parentName,
      "เบอร์โทร": s.parentPhone,
      ที่อยู่: s.address,
      สถานะ: s.status,
    }));
    downloadCsv("solven-registry", csvRows);
  };

  return (
    <div className="shell">
      <Sidebar />
      <div className="main-col">
        <header className="topbar">
          <div>
            <h1 className="page-title">ทะเบียนนักเรียน</h1>
            <p className="page-sub">
              ข้อมูลนักเรียนทั้งโรงเรียน (ข้อมูลสมมติ PDPA) — ค้นหาและส่งออก CSV
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
              placeholder="ค้นหาชื่อ รหัส ชั้น หรือสถานะ..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              style={{ maxWidth: 360 }}
            />
            <span className="section-hint" style={{ marginLeft: 10 }}>
              พบ {filtered.length} คน จาก {rows.length} คน
            </span>
          </div>

          {loading ? (
            <div className="panel panel-pad">กำลังโหลด...</div>
          ) : filtered.length === 0 ? (
            <div className="panel panel-pad">
              <div className="empty">
                <div className="empty-icon">🔍</div>
                <div className="empty-title">ไม่พบนักเรียนที่ตรงเงื่อนไข</div>
                <div className="empty-text">ลองเปลี่ยนคำค้นหา</div>
              </div>
            </div>
          ) : (
            <div className="panel panel-pad">
              <table className="table" style={{ width: "100%" }}>
                <thead>
                  <tr>
                    <th>รหัส</th>
                    <th>ชื่อ</th>
                    <th>วันเกิด</th>
                    <th>ชั้น</th>
                    <th>ผู้ปกครอง</th>
                    <th>เบอร์โทร</th>
                    <th>สถานะ</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((s) => (
                    <tr key={s.id}>
                      <td>{s.id}</td>
                      <td>{s.name}</td>
                      <td>{s.birthDate}</td>
                      <td>{s.className}</td>
                      <td>{s.parentName}</td>
                      <td>{s.parentPhone}</td>
                      <td>
                        <span className={statusBadge(s.status)}>{s.status}</span>
                      </td>
                    </tr>
                  ))}
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
