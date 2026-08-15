"use client";

import { useEffect, useState } from "react";
import Sidebar from "@/components/Sidebar";
import { fetchMarketplace, MarketItem, MarketplaceData } from "@/lib/community";

export default function MarketplacePage() {
  const [data, setData] = useState<MarketplaceData>({ items: [] });
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [form, setForm] = useState({ title: "", author: "", price: "" });

  useEffect(() => {
    fetchMarketplace().then((d) => {
      setData(d);
      setLoading(false);
    });
  }, []);

  const q = query.trim().toLowerCase();
  const filtered = data.items.filter(
    (i) =>
      !q ||
      i.title.toLowerCase().includes(q) ||
      i.author.toLowerCase().includes(q) ||
      i.type.toLowerCase().includes(q)
  );

  const publish = () => {
    if (!form.title.trim() || !form.author.trim()) return;
    const item: MarketItem = {
      id: `m-local-${Date.now()}`,
      title: form.title.trim(),
      type: "สื่อใหม่",
      author: form.author.trim(),
      downloads: 0,
      rating: 5,
      price: form.price.trim() || "ฟรี",
    };
    setData((d) => ({ items: [item, ...d.items] }));
    setForm({ title: "", author: "", price: "" });
  };

  return (
    <div className="shell">
      <Sidebar />
      <div className="main-col">
        <header className="topbar">
          <div>
            <h1 className="page-title">ตลาดสื่อการเรียนการสอน</h1>
            <p className="page-sub">
              แบ่งปันสื่อระหว่างครูในเครือข่าย (ข้อมูลตัวอย่าง PDPA) — ค้นหาและเผยแพร่สื่อการสอน
            </p>
          </div>
          <div className="topbar-actions">
            <span className="badge">{data.items.length} รายการ</span>
          </div>
        </header>
        <main className="content view-in">
          <div className="panel panel-pad" style={{ marginBottom: 14 }}>
            <input
              className="input"
              placeholder="ค้นหาสื่อตามชื่อ / ผู้เผยแพร่ / ประเภท..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              style={{ maxWidth: 420 }}
            />
          </div>
          {loading ? (
            <div className="panel panel-pad">กำลังโหลด...</div>
          ) : (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
                gap: 14,
              }}
            >
              {filtered.map((item) => (
                <div className="panel panel-pad" key={item.id}>
                  <div style={{ marginBottom: 6 }}>
                    <span className="badge">{item.type}</span>
                    <span className="badge badge-pending" style={{ marginLeft: 6 }}>
                      {item.price}
                    </span>
                  </div>
                  <h2 className="section-title" style={{ fontSize: 15 }}>
                    {item.title}
                  </h2>
                  <p className="section-hint">โดย {item.author}</p>
                  <p className="field-label">
                    ★ {item.rating.toFixed(1)} · {item.downloads.toLocaleString()} ดาวน์โหลด
                  </p>
                </div>
              ))}
            </div>
          )}
          <div className="panel panel-pad" style={{ marginTop: 14 }}>
            <h2 className="section-title">เผยแพร่สื่อของคุณ</h2>
            <p className="section-hint">ตัวอย่างฟอร์ม — บันทึกในเครื่องเท่านั้น (โหมดสาธิต)</p>
            <div className="field">
              <label className="field-label">ชื่อสื่อ</label>
              <input
                className="input"
                placeholder="เช่น บัตรคำศัพท์ภาษาไทย ป.1"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
              />
            </div>
            <div className="field">
              <label className="field-label">ผู้เผยแพร่</label>
              <input
                className="input"
                placeholder="ชื่อครู"
                value={form.author}
                onChange={(e) => setForm({ ...form, author: e.target.value })}
              />
            </div>
            <div className="field">
              <label className="field-label">ราคา (เว้นว่าง = ฟรี)</label>
              <input
                className="input"
                placeholder="เช่น 50 บาท"
                value={form.price}
                onChange={(e) => setForm({ ...form, price: e.target.value })}
                style={{ maxWidth: 240 }}
              />
            </div>
            <button type="button" className="btn btn-primary btn-sm" onClick={publish}>
              เผยแพร่สื่อ
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
