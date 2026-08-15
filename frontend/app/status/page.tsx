"use client";

import { useEffect, useState } from "react";
import Sidebar from "@/components/Sidebar";
import { fetchStatus, SystemStatus } from "@/lib/community";

export default function StatusPage() {
  const [status, setStatus] = useState<SystemStatus | null>(null);
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    fetchStatus().then((s) => {
      setStatus(s);
      setLoading(false);
    });
  };

  useEffect(() => {
    load();
  }, []);

  const okCount = status?.checks.filter((c) => c.ok).length ?? 0;

  return (
    <div className="shell">
      <Sidebar />
      <div className="main-col">
        <header className="topbar">
          <div>
            <h1 className="page-title">สถานะระบบ</h1>
            <p className="page-sub">
              ตรวจสอบความพร้อมของระบบ Solven (ข้อมูลตัวอย่าง PDPA)
            </p>
          </div>
          <div className="topbar-actions">
            <button type="button" className="btn btn-secondary btn-sm" onClick={load}>
              ตรวจสอบอีกครั้ง
            </button>
          </div>
        </header>
        <main className="content view-in">
          {loading || !status ? (
            <div className="panel panel-pad">กำลังตรวจสอบ...</div>
          ) : (
            <>
              <div className="panel panel-pad" style={{ marginBottom: 14 }}>
                <div className="field" style={{ marginBottom: 0 }}>
                  <span className="badge">
                    {okCount}/{status.checks.length} ระบบปกติ
                  </span>
                  <span className="section-hint" style={{ marginLeft: 8 }}>
                    อัปเดตล่าสุด: 16 ส.ค. 2569
                  </span>
                </div>
                <table className="table" style={{ width: "100%", marginTop: 10 }}>
                  <thead>
                    <tr>
                      <th>รายการ</th>
                      <th>สถานะ</th>
                      <th>รายละเอียด</th>
                    </tr>
                  </thead>
                  <tbody>
                    {status.checks.map((c) => (
                      <tr key={c.name}>
                        <td>{c.name}</td>
                        <td>
                          {c.ok ? (
                            <span className="badge">✓ ปกติ</span>
                          ) : (
                            <span className="badge badge-pending">✗ มีปัญหา</span>
                          )}
                        </td>
                        <td>{c.detail}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="panel panel-pad">
                <h2 className="section-title">ข้อมูลเวอร์ชัน</h2>
                <p className="field-label">เวอร์ชัน: {status.version}</p>
                <p className="field-label">เวลาทำงานต่อเนื่อง: {status.uptimeDays} วัน</p>
                <p className="section-hint">โหมดสาธิต (demo) — ข้อมูลทั้งหมดเป็นตัวอย่าง (PDPA)</p>
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
