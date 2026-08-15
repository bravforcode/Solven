"use client";

import { FormEvent, useEffect, useState } from "react";
import Sidebar from "@/components/Sidebar";
import { fetchLeaves, LeaveRequest } from "@/lib/staff";

const LEAVE_TYPES = ["ลาป่วย", "ลากิจ", "ลาคลอด", "ลาพักผ่อน"];

export default function LeavePage() {
  const [requests, setRequests] = useState<LeaveRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [nextId, setNextId] = useState(101);
  const [form, setForm] = useState({
    teacherName: "",
    type: LEAVE_TYPES[0],
    startDate: "2026-08-20",
    days: "1",
    reason: "",
  });

  useEffect(() => {
    fetchLeaves().then((rows) => {
      setRequests(rows);
      setLoading(false);
    });
  }, []);

  const setStatus = (id: string, status: string) => {
    setRequests((rows) =>
      rows.map((r) => (r.id === id ? { ...r, status } : r))
    );
  };

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!form.teacherName.trim()) return;
    const newRequest: LeaveRequest = {
      id: `leave-${nextId}`,
      teacherId: `t-${nextId}`,
      teacherName: form.teacherName.trim(),
      type: form.type,
      startDate: form.startDate,
      days: Math.max(1, parseInt(form.days, 10) || 1),
      reason: form.reason.trim() || "—",
      status: "รออนุมัติ",
    };
    setRequests((rows) => [newRequest, ...rows]);
    setNextId((n) => n + 1);
    setForm({ ...form, teacherName: "", reason: "" });
  };

  return (
    <div className="shell">
      <Sidebar />
      <div className="main-col">
        <header className="topbar">
          <div>
            <h1 className="page-title">การลา</h1>
            <p className="page-sub">
              บันทึกคำขอลาและอนุมัติการลาของบุคลากร (ข้อมูลตัวอย่าง PDPA)
            </p>
          </div>
        </header>
        <main className="content view-in">
          <div className="panel panel-pad" style={{ marginBottom: 14 }}>
            <h2 className="section-title">ยื่นคำขอลา</h2>
            <form onSubmit={submit} style={{ display: "grid", gap: 10, maxWidth: 560 }}>
              <div className="field">
                <label className="field-label">ชื่อผู้ขอลา</label>
                <input
                  className="input"
                  placeholder="เช่น นางสาวสมหญิง ใจดี"
                  value={form.teacherName}
                  onChange={(e) => setForm({ ...form, teacherName: e.target.value })}
                />
              </div>
              <div className="field">
                <label className="field-label">ประเภทการลา</label>
                <select
                  className="select"
                  value={form.type}
                  onChange={(e) => setForm({ ...form, type: e.target.value })}
                >
                  {LEAVE_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>
              <div className="field">
                <label className="field-label">วันที่เริ่มลา</label>
                <input
                  type="date"
                  className="input"
                  value={form.startDate}
                  onChange={(e) => setForm({ ...form, startDate: e.target.value })}
                />
              </div>
              <div className="field">
                <label className="field-label">จำนวนวัน</label>
                <input
                  type="number"
                  min={1}
                  className="input"
                  value={form.days}
                  onChange={(e) => setForm({ ...form, days: e.target.value })}
                  style={{ maxWidth: 120 }}
                />
              </div>
              <div className="field">
                <label className="field-label">เหตุผล</label>
                <textarea
                  className="textarea"
                  rows={2}
                  placeholder="ระบุเหตุผลการลา"
                  value={form.reason}
                  onChange={(e) => setForm({ ...form, reason: e.target.value })}
                />
              </div>
              <div>
                <button type="submit" className="btn btn-primary btn-sm">
                  ยื่นคำขอลา
                </button>
              </div>
            </form>
          </div>
          {loading ? (
            <div className="panel panel-pad">กำลังโหลด...</div>
          ) : (
            <div className="panel panel-pad">
              <h2 className="section-title">รายการคำขอลา</h2>
              <table className="table" style={{ width: "100%", marginTop: 10 }}>
                <thead>
                  <tr>
                    <th>ชื่อ</th>
                    <th>ประเภท</th>
                    <th>วันที่เริ่ม</th>
                    <th>จำนวนวัน</th>
                    <th>เหตุผล</th>
                    <th>สถานะ</th>
                    <th>ดำเนินการ</th>
                  </tr>
                </thead>
                <tbody>
                  {requests.map((r) => (
                    <tr key={r.id}>
                      <td>{r.teacherName}</td>
                      <td>{r.type}</td>
                      <td>{r.startDate}</td>
                      <td>{r.days}</td>
                      <td>{r.reason}</td>
                      <td>
                        <span
                          className={
                            r.status === "อนุมัติ"
                              ? "badge badge-approved"
                              : r.status === "ปฏิเสธ"
                                ? "badge badge-pending"
                                : "badge"
                          }
                        >
                          {r.status}
                        </span>
                      </td>
                      <td>
                        {r.status === "รออนุมัติ" ? (
                          <span style={{ display: "flex", gap: 6 }}>
                            <button
                              type="button"
                              className="btn btn-primary btn-sm"
                              onClick={() => setStatus(r.id, "อนุมัติ")}
                            >
                              อนุมัติ
                            </button>
                            <button
                              type="button"
                              className="btn btn-secondary btn-sm"
                              onClick={() => setStatus(r.id, "ปฏิเสธ")}
                            >
                              ปฏิเสธ
                            </button>
                          </span>
                        ) : (
                          <span className="section-hint">—</span>
                        )}
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
