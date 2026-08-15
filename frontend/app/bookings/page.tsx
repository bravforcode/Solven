"use client";

import { useEffect, useState } from "react";
import Sidebar from "@/components/Sidebar";
import { fetchBookings, Booking, BookingsData } from "@/lib/community";

export default function BookingsPage() {
  const [data, setData] = useState<BookingsData>({ rooms: [], bookings: [] });
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ item: "ห้องประชุมใหญ่", booker: "", date: "", purpose: "" });

  useEffect(() => {
    fetchBookings().then((d) => {
      setData(d);
      setLoading(false);
    });
  }, []);

  const book = () => {
    if (!form.booker.trim() || !form.date.trim() || !form.purpose.trim()) return;
    const booking: Booking = {
      id: `bk-local-${Date.now()}`,
      item: form.item,
      booker: form.booker.trim(),
      date: form.date.trim(),
      time: "08:00-17:00",
      purpose: form.purpose.trim(),
      status: "จองแล้ว",
    };
    setData((d) => ({ ...d, bookings: [booking, ...d.bookings] }));
    setForm({ item: "ห้องประชุมใหญ่", booker: "", date: "", purpose: "" });
  };

  return (
    <div className="shell">
      <Sidebar />
      <div className="main-col">
        <header className="topbar">
          <div>
            <h1 className="page-title">จองห้องและอุปกรณ์</h1>
            <p className="page-sub">
              ระบบจองห้องเรียนพิเศษและอุปกรณ์ของโรงเรียน (ข้อมูลตัวอย่าง PDPA)
            </p>
          </div>
          <div className="topbar-actions">
            <span className="badge">{data.rooms.length} ห้อง</span>
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
                {data.rooms.map((r) => (
                  <div className="panel panel-pad" key={r.id}>
                    <h2 className="section-title" style={{ fontSize: 15 }}>
                      {r.name}
                    </h2>
                    <p className="section-hint">รองรับ {r.capacity} คน</p>
                    <p className="field-label" style={{ fontWeight: 400 }}>
                      อุปกรณ์: {r.equipment.join(" · ")}
                    </p>
                  </div>
                ))}
              </div>
              <div className="panel panel-pad" style={{ marginTop: 14 }}>
                <h2 className="section-title">ตารางการจอง</h2>
                <table className="table" style={{ width: "100%", marginTop: 10 }}>
                  <thead>
                    <tr>
                      <th>สถานที่</th>
                      <th>ผู้จอง</th>
                      <th>วัน/เวลา</th>
                      <th>วัตถุประสงค์</th>
                      <th>สถานะ</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.bookings.map((b) => (
                      <tr key={b.id}>
                        <td>{b.item}</td>
                        <td>{b.booker}</td>
                        <td>
                          {b.date} · {b.time}
                        </td>
                        <td>{b.purpose}</td>
                        <td>
                          {b.status === "จองแล้ว" ? (
                            <span className="badge">{b.status}</span>
                          ) : (
                            <span className="badge badge-pending">{b.status}</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="panel panel-pad" style={{ marginTop: 14 }}>
                <h2 className="section-title">จองห้อง / อุปกรณ์</h2>
                <p className="section-hint">ตัวอย่างฟอร์ม — บันทึกในเครื่องเท่านั้น (โหมดสาธิต)</p>
                <div className="field">
                  <label className="field-label">สถานที่</label>
                  <select
                    className="select"
                    value={form.item}
                    onChange={(e) => setForm({ ...form, item: e.target.value })}
                    style={{ maxWidth: 320 }}
                  >
                    {data.rooms.map((r) => (
                      <option key={r.id} value={r.name}>
                        {r.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="field">
                  <label className="field-label">ชื่อผู้จอง</label>
                  <input
                    className="input"
                    placeholder="ชื่อ-นามสกุล"
                    value={form.booker}
                    onChange={(e) => setForm({ ...form, booker: e.target.value })}
                    style={{ maxWidth: 360 }}
                  />
                </div>
                <div className="field">
                  <label className="field-label">วันที่ต้องการ</label>
                  <input
                    className="input"
                    placeholder="เช่น 25 ส.ค. 2569"
                    value={form.date}
                    onChange={(e) => setForm({ ...form, date: e.target.value })}
                    style={{ maxWidth: 360 }}
                  />
                </div>
                <div className="field">
                  <label className="field-label">วัตถุประสงค์</label>
                  <input
                    className="input"
                    placeholder="เช่น จัดประชุมผู้ปกครอง"
                    value={form.purpose}
                    onChange={(e) => setForm({ ...form, purpose: e.target.value })}
                    style={{ maxWidth: 360 }}
                  />
                </div>
                <button type="button" className="btn btn-primary btn-sm" onClick={book}>
                  จอง
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
