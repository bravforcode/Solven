"use client";

import { useEffect, useState } from "react";
import Sidebar from "@/components/Sidebar";
import { fetchPayroll, Payroll } from "@/lib/finance";

const fmt = (n: number) => `${n.toLocaleString("th-TH")} บาท`;

function statusBadge(status: string) {
  if (status === "จ่ายแล้ว") return <span className="badge badge-approved">{status}</span>;
  return <span className="badge badge-pending">{status}</span>;
}

export default function PayrollPage() {
  const [payroll, setPayroll] = useState<Payroll | null>(null);
  const [loading, setLoading] = useState(true);
  const [showSlip, setShowSlip] = useState(false);

  useEffect(() => {
    fetchPayroll().then((data) => {
      setPayroll(data);
      setLoading(false);
    });
  }, []);

  const buildSlip = () => setShowSlip(true);

  return (
    <div className="shell">
      <Sidebar />
      <div className="main-col">
        <header className="topbar">
          <div>
            <h1 className="page-title">เงินเดือน</h1>
            <p className="page-sub">
              สลิปเงินเดือนบุคลากรตัวอย่าง (ข้อมูลสมมติ PDPA) — เงินเดือน เงินเพิ่ม รายการหัก และสุทธิ
            </p>
          </div>
          <div className="topbar-actions">
            <button type="button" className="btn btn-primary btn-sm" onClick={buildSlip}>
              สร้างสลิปเดือนนี้
            </button>
          </div>
        </header>
        <main className="content view-in">
          {loading ? (
            <div className="panel panel-pad">กำลังโหลด...</div>
          ) : (
            <>
              <div className="panel panel-pad" style={{ marginBottom: 14 }}>
                <h2 className="section-title">สรุปเงินเดือน {payroll?.month}</h2>
                <div className="section-hint" style={{ display: "flex", gap: 28, flexWrap: "wrap", marginTop: 8 }}>
                  <div>
                    <div className="field-label">รวมเงินเดือนฐาน</div>
                    <strong>{fmt(payroll?.totals.base ?? 0)}</strong>
                  </div>
                  <div>
                    <div className="field-label">รวมเงินเพิ่ม</div>
                    <strong>{fmt(payroll?.totals.allowances ?? 0)}</strong>
                  </div>
                  <div>
                    <div className="field-label">รวมรายการหัก</div>
                    <strong>{fmt(payroll?.totals.deductions ?? 0)}</strong>
                  </div>
                  <div>
                    <div className="field-label">รวมสุทธิ</div>
                    <strong style={{ color: "#16a34a" }}>{fmt(payroll?.totals.net ?? 0)}</strong>
                  </div>
                </div>
              </div>

              <div className="panel panel-pad" style={{ marginBottom: 14 }}>
                <h2 className="section-title">พนักงานทั้งหมด ({payroll?.employees.length ?? 0} คน)</h2>
                <table className="table" style={{ width: "100%", marginTop: 10 }}>
                  <thead>
                    <tr>
                      <th>ชื่อ</th>
                      <th>ตำแหน่ง</th>
                      <th>เงินเดือนฐาน</th>
                      <th>รวมเงินเพิ่ม</th>
                      <th>รวมรายการหัก</th>
                      <th>สุทธิ</th>
                      <th>สถานะ</th>
                    </tr>
                  </thead>
                  <tbody>
                    {payroll?.employees.map((emp) => (
                      <tr key={emp.id}>
                        <td>{emp.name}</td>
                        <td>{emp.position}</td>
                        <td>{fmt(emp.baseSalary)}</td>
                        <td>{fmt(emp.allowanceTotal)}</td>
                        <td>{fmt(emp.deductionTotal)}</td>
                        <td>
                          <strong>{fmt(emp.net)}</strong>
                        </td>
                        <td>{statusBadge(emp.status)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {showSlip && (
                <div className="panel panel-pad" style={{ marginBottom: 14 }}>
                  <h2 className="section-title">สลิปเงินเดือน {payroll?.month} (ตัวอย่าง)</h2>
                  <table className="table" style={{ width: "100%", marginTop: 10 }}>
                    <thead>
                      <tr>
                        <th>ชื่อ</th>
                        <th>ตำแหน่ง</th>
                        <th>เงินเดือนฐาน</th>
                        <th>เงินเพิ่ม</th>
                        <th>รายการหัก</th>
                        <th>สุทธิ</th>
                      </tr>
                    </thead>
                    <tbody>
                      {payroll?.employees.map((emp) => (
                        <tr key={emp.id}>
                          <td>{emp.name}</td>
                          <td>{emp.position}</td>
                          <td>{fmt(emp.baseSalary)}</td>
                          <td>{fmt(emp.allowanceTotal)}</td>
                          <td>{fmt(emp.deductionTotal)}</td>
                          <td>
                            <strong>{fmt(emp.net)}</strong>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <p className="section-hint" style={{ marginTop: 10 }}>
                    ลงชื่อ …………………………… ผู้จ่ายเงิน · สลิปนี้เป็นตัวอย่าง (โหมดสาธิต) — ยังไม่ได้จ่ายจริง
                  </p>
                </div>
              )}
            </>
          )}
          <p className="section-hint" style={{ marginTop: 14 }}>
            รายการเงินเพิ่ม/หักของแต่ละคนดูได้จากสลิป · ข้อมูลทั้งหมดเป็นข้อมูลสมมติ (PDPA)
          </p>
        </main>
        <footer className="footer">
          Solven prototype — ข้อมูลทั้งหมดเป็นตัวอย่าง/อยู่ในเครื่องเท่านั้น ไม่มีข้อมูลนักเรียนจริง (PDPA)
        </footer>
      </div>
    </div>
  );
}
