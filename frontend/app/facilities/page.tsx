"use client";

import { FormEvent, useEffect, useState } from "react";
import Sidebar from "@/components/Sidebar";
import { fetchFacilities, FacilitiesData, FacilityRequest } from "@/lib/staff";

const PRIORITIES = ["ต่ำ", "กลาง", "สูง"];

function conditionBadge(condition: string): string {
  if (condition === "ดี") return "badge badge-approved";
  if (condition === "พอใช้") return "badge";
  return "badge badge-pending";
}

function priorityBadge(priority: string): string {
  if (priority === "สูง") return "badge badge-pending";
  return "badge";
}

export default function FacilitiesPage() {
  const [data, setData] = useState<FacilitiesData | null>(null);
  const [requests, setRequests] = useState<FacilityRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [nextId, setNextId] = useState(101);
  const [form, setForm] = useState({ room: "", issue: "", priority: PRIORITIES[0] });

  useEffect(() => {
    fetchFacilities().then((d) => {
      setData(d);
      setRequests(d.requests);
      setLoading(false);
      if (d.rooms.length > 0) setForm((f) => ({ ...f, room: d.rooms[0].name }));
    });
  }, []);

  if (loading || !data) {
    return (
      <div className="shell">
        <Sidebar />
        <div className="main-col">
          <header className="topbar">
            <div>
              <h1 className="page-title">อาคารสถานที่</h1>
              <p className="page-sub">กำลังโหลด...</p>
            </div>
          </header>
          <main className="content view-in">
            <div className="panel panel-pad">กำลังโหลด...</div>
          </main>
          <footer className="footer">
            Solven prototype — ข้อมูลทั้งหมดเป็นตัวอย่าง/อยู่ในเครื่องเท่านั้น ไม่มีข้อมูลนักเรียนจริง (PDPA)
          </footer>
        </div>
      </div>
    );
  }

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!form.issue.trim()) return;
    setRequests((rows) => [
      ...rows,
      {
        id: `fr-${nextId}`,
        room: form.room,
        issue: form.issue.trim(),
        priority: form.priority,
        status: "รอซ่อม",
      },
    ]);
    setNextId((n) => n + 1);
    setForm({ ...form, issue: "" });
  };

  return (
    <div className="shell">
      <Sidebar />
      <div className="main-col">
        <header className="topbar">
          <div>
            <h1 className="page-title">อาคารสถานที่</h1>
            <p className="page-sub">
              สภาพห้องเรียน/อาคารและการแจ้งซ่อมบำรุง (ข้อมูลตัวอย่าง PDPA)
            </p>
          </div>
        </header>
        <main className="content view-in">
          <div className="panel panel-pad" style={{ marginBottom: 14 }}>
            <h2 className="section-title">สภาพอาคารและห้องเรียน</h2>
            <table className="table" style={{ width: "100%", marginTop: 10 }}>
              <thead>
                <tr>
                  <th>ห้อง/อาคาร</th>
                  <th>สภาพ</th>
                  <th>ตรวจสอบล่าสุด</th>
                </tr>
              </thead>
              <tbody>
                {data.rooms.map((r) => (
                  <tr key={r.name}>
                    <td>{r.name}</td>
                    <td>
                      <span className={conditionBadge(r.condition)}>{r.condition}</span>
                    </td>
                    <td>{r.lastInspection}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="panel panel-pad" style={{ marginBottom: 14 }}>
            <h2 className="section-title">รายการแจ้งซ่อม</h2>
            <table className="table" style={{ width: "100%", marginTop: 10 }}>
              <thead>
                <tr>
                  <th>สถานที่</th>
                  <th>ปัญหา</th>
                  <th>ความเร่งด่วน</th>
                  <th>สถานะ</th>
                </tr>
              </thead>
              <tbody>
                {requests.map((r) => (
                  <tr key={r.id}>
                    <td>{r.room}</td>
                    <td>{r.issue}</td>
                    <td>
                      <span className={priorityBadge(r.priority)}>{r.priority}</span>
                    </td>
                    <td>
                      <span
                        className={
                          r.status === "ซ่อมเสร็จ" ? "badge badge-approved" : "badge badge-pending"
                        }
                      >
                        {r.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="panel panel-pad">
            <h2 className="section-title">แจ้งซ่อม</h2>
            <form
              onSubmit={submit}
              style={{ display: "grid", gap: 10, maxWidth: 560, marginTop: 10 }}
            >
              <div className="field">
                <label className="field-label">สถานที่</label>
                <select
                  className="select"
                  value={form.room}
                  onChange={(e) => setForm({ ...form, room: e.target.value })}
                >
                  {data.rooms.map((r) => (
                    <option key={r.name} value={r.name}>
                      {r.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="field">
                <label className="field-label">ปัญหา / รายละเอียด</label>
                <textarea
                  className="textarea"
                  rows={2}
                  placeholder="เช่น ประตูห้องเรียนบานพับหลุด"
                  value={form.issue}
                  onChange={(e) => setForm({ ...form, issue: e.target.value })}
                />
              </div>
              <div className="field">
                <label className="field-label">ความเร่งด่วน</label>
                <select
                  className="select"
                  value={form.priority}
                  onChange={(e) => setForm({ ...form, priority: e.target.value })}
                  style={{ maxWidth: 160 }}
                >
                  {PRIORITIES.map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <button type="submit" className="btn btn-primary btn-sm">
                  แจ้งซ่อม
                </button>
              </div>
            </form>
          </div>
        </main>
        <footer className="footer">
          Solven prototype — ข้อมูลทั้งหมดเป็นตัวอย่าง/อยู่ในเครื่องเท่านั้น ไม่มีข้อมูลนักเรียนจริง (PDPA)
        </footer>
      </div>
    </div>
  );
}
