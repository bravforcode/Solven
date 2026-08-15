"use client";

import { useEffect, useState } from "react";
import Sidebar from "@/components/Sidebar";
import { fetchDocRegister, DocEntry, DocRegister } from "@/lib/govdocs";

export default function DocRegistryPage() {
  const [data, setData] = useState<DocRegister>({ entries: [], summary: { total: 0, incoming: 0, outgoing: 0, pendingSign: 0 }, generatedBy: "" });
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [form, setForm] = useState({ type: "รับ" as "รับ" | "ส่ง", from: "", to: "", subject: "" });

  useEffect(() => {
    fetchDocRegister().then((rows) => {
      setData(rows);
      setLoading(false);
    });
  }, []);

  const q = query.trim().toLowerCase();
  const filtered = data.entries.filter(
    (e) =>
      !q ||
      e.regNo.toLowerCase().includes(q) ||
      e.subject.toLowerCase().includes(q) ||
      e.from.toLowerCase().includes(q) ||
      e.to.toLowerCase().includes(q)
  );

  const statusBadge = (s: DocEntry["status"]) =>
    s === "ส่งแล้ว" ? <span className="badge badge-approved">{s}</span> : s === "ลงนามแล้ว" ? <span className="badge badge-pending">{s}</span> : <span className="badge badge-quarantined">{s}</span>;

  const addEntry = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.subject.trim()) return;
    const next: DocEntry = {
      id: `reg-${data.entries.length + 1 < 10 ? "00" : "0"}${data.entries.length + 1}`,
      regNo: `ที่ ศธ 04001/${2500 + data.entries.length + 1}`,
      type: form.type,
      from: form.from || "โรงเรียนบ้านสวนฝั่งสุข",
      to: form.to || "โรงเรียนบ้านสวนฝั่งสุข",
      subject: form.subject,
      date: new Date().toISOString().slice(0, 10),
      status: "รอลงนาม",
    };
    setData((prev) => ({
      ...prev,
      entries: [next, ...prev.entries],
      summary: { ...prev.summary, total: prev.summary.total + 1 },
    }));
    setForm({ type: "รับ", from: "", to: "", subject: "" });
  };

  return (
    <div className="shell">
      <Sidebar />
      <div className="main-col">
        <header className="topbar">
          <div>
            <h1 className="page-title">ทะเบียนหนังสือราชการ</h1>
            <p className="page-sub">
              หนังสือเข้า-ออก พร้อมเลขที่อัตโนมัติ (ข้อมูลสมมติ) — ครบวงจรการรับ-ส่งหนังสือของโรงเรียน
            </p>
          </div>
        </header>
        <main className="content view-in">
          <div className="panel panel-pad" style={{ marginBottom: 14 }}>
            <div style={{ display: "flex", gap: 18, flexWrap: "wrap" }}>
              <div><div className="page-title" style={{ fontSize: 22 }}>{data.summary.total}</div><span className="field-hint">รวมทั้งหมด</span></div>
              <div><div className="page-title" style={{ fontSize: 22 }}>{data.summary.incoming}</div><span className="field-hint">หนังสือรับ</span></div>
              <div><div className="page-title" style={{ fontSize: 22 }}>{data.summary.outgoing}</div><span className="field-hint">หนังสือส่ง</span></div>
              <div><div className="page-title" style={{ fontSize: 22 }}>{data.summary.pendingSign}</div><span className="field-hint">รอลงนาม</span></div>
            </div>
          </div>

          <div className="panel panel-pad" style={{ marginBottom: 14 }}>
            <h2 className="section-title">ลงทะเบียนใหม่</h2>
            <form onSubmit={addEntry} style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 10 }}>
              <select className="input" style={{ maxWidth: 110 }} value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value as "รับ" | "ส่ง" })}>
                <option value="รับ">รับ</option>
                <option value="ส่ง">ส่ง</option>
              </select>
              <input className="input" placeholder="จาก (หน่วยงาน)" value={form.from} onChange={(e) => setForm({ ...form, from: e.target.value })} style={{ maxWidth: 220 }} />
              <input className="input" placeholder="ถึง (หน่วยงาน)" value={form.to} onChange={(e) => setForm({ ...form, to: e.target.value })} style={{ maxWidth: 220 }} />
              <input className="input" placeholder="เรื่อง" value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} style={{ flex: 1, minWidth: 200 }} />
              <button type="submit" className="btn btn-primary">ลงทะเบียน</button>
            </form>
          </div>

          <div className="panel panel-pad">
            <input
              className="input"
              placeholder="ค้นหาหนังสือ (เลขที่/เรื่อง/หน่วยงาน)..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              style={{ maxWidth: 380, marginBottom: 12 }}
            />
            {loading ? (
              <p className="section-hint">กำลังโหลด...</p>
            ) : (
              <table className="table" style={{ width: "100%" }}>
                <thead>
                  <tr>
                    <th>เลขที่</th>
                    <th>ประเภท</th>
                    <th>จาก / ถึง</th>
                    <th>เรื่อง</th>
                    <th>วันที่</th>
                    <th>สถานะ</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((e) => (
                    <tr key={e.id}>
                      <td>{e.regNo}</td>
                      <td><span className={`badge ${e.type === "รับ" ? "badge-pending" : "badge-approved"}`}>{e.type}</span></td>
                      <td>{e.from} → {e.to}</td>
                      <td>{e.subject}</td>
                      <td>{e.date}</td>
                      <td>{statusBadge(e.status)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </main>
        <footer className="footer">
          Solven prototype — ข้อมูลทั้งหมดเป็นตัวอย่าง/อยู่ในเครื่องเท่านั้น ไม่มีข้อมูลนักเรียนจริง (PDPA)
        </footer>
      </div>
    </div>
  );
}