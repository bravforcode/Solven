"use client";

import { useEffect, useState } from "react";
import Sidebar from "@/components/Sidebar";
import { fetchNews, NewsFeed, NewsItem } from "@/lib/community";

export default function NewsPage() {
  const [data, setData] = useState<NewsFeed>({ items: [] });
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ title: "", category: "ประชาสัมพันธ์", body: "" });

  useEffect(() => {
    fetchNews().then((d) => {
      setData(d);
      setLoading(false);
    });
  }, []);

  const addNews = () => {
    if (!form.title.trim() || !form.body.trim()) return;
    const item: NewsItem = {
      id: `n-local-${Date.now()}`,
      title: form.title.trim(),
      category: form.category,
      date: "16 ส.ค. 2569",
      body: form.body.trim(),
      pinned: false,
    };
    setData((d) => ({ items: [item, ...d.items] }));
    setForm({ title: "", category: "ประชาสัมพันธ์", body: "" });
  };

  const sorted = [...data.items].sort((a, b) => Number(b.pinned) - Number(a.pinned));

  return (
    <div className="shell">
      <Sidebar />
      <div className="main-col">
        <header className="topbar">
          <div>
            <h1 className="page-title">ประกาศโรงเรียน</h1>
            <p className="page-sub">
              ข่าวสารประชาสัมพันธ์สำหรับครู ผู้ปกครอง และนักเรียน (ข้อมูลตัวอย่าง PDPA)
            </p>
          </div>
          <div className="topbar-actions">
            <span className="badge">{data.items.length} ประกาศ</span>
          </div>
        </header>
        <main className="content view-in">
          {loading ? (
            <div className="panel panel-pad">กำลังโหลด...</div>
          ) : (
            <>
              {sorted.map((item) => (
                <div
                  className="panel panel-pad"
                  key={item.id}
                  style={{
                    marginBottom: 14,
                    borderLeft: item.pinned ? "4px solid #d9a441" : undefined,
                  }}
                >
                  <div style={{ marginBottom: 4 }}>
                    <span className="badge">{item.category}</span>
                    {item.pinned && (
                      <span className="badge badge-pending" style={{ marginLeft: 6 }}>
                        📌 ปักหมุด
                      </span>
                    )}
                  </div>
                  <h2 className="section-title" style={{ fontSize: 15 }}>
                    {item.title}
                  </h2>
                  <p className="section-hint">{item.date}</p>
                  <p className="field-label" style={{ fontWeight: 400 }}>
                    {item.body}
                  </p>
                </div>
              ))}
            </>
          )}
          <div className="panel panel-pad">
            <h2 className="section-title">เพิ่มประกาศ</h2>
            <p className="section-hint">ตัวอย่างฟอร์ม — บันทึกในเครื่องเท่านั้น (โหมดสาธิต)</p>
            <div className="field">
              <label className="field-label">หัวข้อประกาศ</label>
              <input
                className="input"
                placeholder="หัวข้อประกาศ"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
              />
            </div>
            <div className="field">
              <label className="field-label">หมวดหมู่</label>
              <select
                className="select"
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
                style={{ maxWidth: 240 }}
              >
                <option>ประชาสัมพันธ์</option>
                <option>วิชาการ</option>
                <option>กิจกรรม</option>
                <option>ข่าวด่วน</option>
              </select>
            </div>
            <div className="field">
              <label className="field-label">เนื้อหา</label>
              <textarea
                className="textarea"
                placeholder="รายละเอียดประกาศ"
                rows={3}
                value={form.body}
                onChange={(e) => setForm({ ...form, body: e.target.value })}
              />
            </div>
            <button type="button" className="btn btn-primary btn-sm" onClick={addNews}>
              เพิ่มประกาศ
            </button>
          </div>
        </main>
        <footer className="footer">
          Solven prototype — ข้อมูลทั้งหมดเป็นตัวอย่าง/อยู่ในเครื่องเท่านั้น ไม่มีข้อมูลนักเรียนจริง (PDPA)
        </footer>
      </div>
    </div>
  );
}
