"use client";

import { useEffect, useState } from "react";
import Sidebar from "@/components/Sidebar";
import { fetchClubs, Club, ClubData } from "@/lib/community";

export default function ActivitiesPage() {
  const [data, setData] = useState<ClubData>({ clubs: [], activities: [] });
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ clubId: "club-001", name: "" });

  useEffect(() => {
    fetchClubs().then((d) => {
      setData(d);
      setLoading(false);
    });
  }, []);

  const register = () => {
    if (!form.name.trim()) return;
    const club = data.clubs.find((c) => c.id === form.clubId);
    if (!club) return;
    const updated: Club = { ...club, members: club.members + 1 };
    setData((d) => ({
      ...d,
      clubs: d.clubs.map((c) => (c.id === updated.id ? updated : c)),
    }));
    setForm({ clubId: "club-001", name: "" });
  };

  const clubName = (id: string) =>
    data.clubs.find((c) => c.id === id)?.name ?? id;

  return (
    <div className="shell">
      <Sidebar />
      <div className="main-col">
        <header className="topbar">
          <div>
            <h1 className="page-title">กิจกรรมและชมรม</h1>
            <p className="page-sub">
              ชมรมและกิจกรรมสะสมชั่วโมงของนักเรียน (ข้อมูลตัวอย่าง PDPA)
            </p>
          </div>
          <div className="topbar-actions">
            <span className="badge">{data.clubs.length} ชมรม</span>
          </div>
        </header>
        <main className="content view-in">
          {loading ? (
            <div className="panel panel-pad">กำลังโหลด...</div>
          ) : (
            <>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
                  gap: 14,
                }}
              >
                {data.clubs.map((c) => (
                  <div className="panel panel-pad" key={c.id}>
                    <h2 className="section-title" style={{ fontSize: 15 }}>
                      {c.name}
                    </h2>
                    <p className="section-hint">ครูที่ปรึกษา: {c.advisor}</p>
                    <p className="field-label">
                      สมาชิก {c.members} คน · {c.schedule}
                    </p>
                  </div>
                ))}
              </div>
              <div className="panel panel-pad" style={{ marginTop: 14 }}>
                <h2 className="section-title">บันทึกกิจกรรม</h2>
                <table className="table" style={{ width: "100%", marginTop: 10 }}>
                  <thead>
                    <tr>
                      <th>วันที่</th>
                      <th>ชมรม</th>
                      <th>ชั่วโมง</th>
                      <th>รายละเอียด</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.activities.map((a) => (
                      <tr key={a.id}>
                        <td>{a.date}</td>
                        <td>{clubName(a.clubId)}</td>
                        <td>{a.hours} ชม.</td>
                        <td>{a.description}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="panel panel-pad" style={{ marginTop: 14 }}>
                <h2 className="section-title">ลงทะเบียนชมรม</h2>
                <p className="section-hint">ตัวอย่างฟอร์ม — บันทึกในเครื่องเท่านั้น (โหมดสาธิต)</p>
                <div className="field">
                  <label className="field-label">ชมรม</label>
                  <select
                    className="select"
                    value={form.clubId}
                    onChange={(e) => setForm({ ...form, clubId: e.target.value })}
                    style={{ maxWidth: 280 }}
                  >
                    {data.clubs.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="field">
                  <label className="field-label">ชื่อนักเรียน</label>
                  <input
                    className="input"
                    placeholder="ชื่อ-นามสกุล"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    style={{ maxWidth: 360 }}
                  />
                </div>
                <button type="button" className="btn btn-primary btn-sm" onClick={register}>
                  ลงทะเบียน
                </button>
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
