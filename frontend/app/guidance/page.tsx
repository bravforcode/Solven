"use client";

import { useEffect, useState } from "react";
import Sidebar from "@/components/Sidebar";
import {
  fetchGuidance,
  GuidanceAppointment,
  GuidanceData,
} from "@/lib/student";
import { LOCAL_REGISTRY } from "@/lib/student";

const NAME_MAP: Record<string, string> = Object.fromEntries(
  LOCAL_REGISTRY.map((s) => [s.id, s.name])
);

function appointmentBadge(status: string) {
  if (status === "พบแล้ว") return "badge badge-approved";
  if (status === "เลื่อนนัด") return "badge";
  return "badge badge-pending";
}

export default function GuidancePage() {
  const [data, setData] = useState<GuidanceData>({ sessions: [], appointments: [] });
  const [loading, setLoading] = useState(true);
  const [date, setDate] = useState("");
  const [studentId, setStudentId] = useState("");
  const [reason, setReason] = useState("");

  useEffect(() => {
    fetchGuidance().then((rows) => {
      setData(rows);
      if (rows.sessions.length > 0) setStudentId(rows.sessions[0].studentId);
      setLoading(false);
    });
  }, []);

  const addAppointment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!date.trim() || !studentId || !reason.trim()) return;
    const next: GuidanceAppointment = {
      id: `a-${data.appointments.length + 1}`,
      date: date.trim(),
      studentId,
      reason: reason.trim(),
      status: "รอพบ",
    };
    setData((prev) => ({
      ...prev,
      appointments: [next, ...prev.appointments],
    }));
    setDate("");
    setReason("");
  };

  return (
    <div className="shell">
      <Sidebar />
      <div className="main-col">
        <header className="topbar">
          <div>
            <h1 className="page-title">ระบบแนะแนว</h1>
            <p className="page-sub">
              บันทึกการให้คำปรึกษาและการนัดหมายของครูแนะแนว (ข้อมูลสมมติ PDPA)
            </p>
          </div>
          <div className="topbar-actions" />
        </header>
        <main className="content view-in">
          <div className="panel panel-pad" style={{ marginBottom: 14 }}>
            <h2 className="section-title">นัดหมายใหม่</h2>
            <form onSubmit={addAppointment} style={{ marginTop: 10 }}>
              <div className="field" style={{ marginBottom: 10 }}>
                <label className="field-label" htmlFor="g-date">
                  วันที่นัดหมาย
                </label>
                <input
                  id="g-date"
                  className="input"
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  style={{ maxWidth: 220 }}
                />
              </div>
              <div className="field" style={{ marginBottom: 10 }}>
                <label className="field-label" htmlFor="g-student">
                  นักเรียน
                </label>
                <select
                  id="g-student"
                  className="select"
                  value={studentId}
                  onChange={(e) => setStudentId(e.target.value)}
                  style={{ maxWidth: 360 }}
                >
                  {LOCAL_REGISTRY.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.id})
                    </option>
                  ))}
                </select>
              </div>
              <div className="field" style={{ marginBottom: 10 }}>
                <label className="field-label" htmlFor="g-reason">
                  เหตุผลที่พบ
                </label>
                <textarea
                  id="g-reason"
                  className="textarea"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  rows={2}
                  style={{ maxWidth: 480 }}
                  placeholder="เช่น ต้องการพูดคุยเรื่องการเรียน..."
                />
              </div>
              <button type="submit" className="btn btn-primary btn-sm">
                บันทึกนัดหมาย
              </button>
            </form>
          </div>

          {loading ? (
            <div className="panel panel-pad">กำลังโหลด...</div>
          ) : (
            <>
              <div className="panel panel-pad" style={{ marginBottom: 14 }}>
                <h2 className="section-title">
                  รายการนัดหมาย <span className="field-hint">({data.appointments.length} รายการ)</span>
                </h2>
                <table className="table" style={{ width: "100%", marginTop: 10 }}>
                  <thead>
                    <tr>
                      <th>วันที่</th>
                      <th>นักเรียน</th>
                      <th>เหตุผล</th>
                      <th>สถานะ</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.appointments.map((a) => (
                      <tr key={a.id}>
                        <td>{a.date}</td>
                        <td>{NAME_MAP[a.studentId] ?? a.studentId}</td>
                        <td>{a.reason}</td>
                        <td>
                          <span className={appointmentBadge(a.status)}>{a.status}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="panel panel-pad">
                <h2 className="section-title">
                  บันทึกการให้คำปรึกษา <span className="field-hint">({data.sessions.length} ครั้ง)</span>
                </h2>
                <table className="table" style={{ width: "100%", marginTop: 10 }}>
                  <thead>
                    <tr>
                      <th>วันที่</th>
                      <th>นักเรียน</th>
                      <th>หัวข้อ</th>
                      <th>สรุป</th>
                      <th>ครูแนะแนว</th>
                      <th>การติดตาม</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.sessions.map((s) => (
                      <tr key={s.id}>
                        <td>{s.date}</td>
                        <td>{NAME_MAP[s.studentId] ?? s.studentId}</td>
                        <td>{s.topic}</td>
                        <td>{s.summary}</td>
                        <td>{s.counselor}</td>
                        <td>{s.followUp}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
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
