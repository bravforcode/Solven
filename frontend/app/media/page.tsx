"use client";

import { useEffect, useState } from "react";
import Sidebar from "@/components/Sidebar";
import { fetchMediaLibrary, MediaItem } from "@/lib/teaching";

export default function MediaPage() {
  const [items, setItems] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [uploaded, setUploaded] = useState<string | null>(null);

  useEffect(() => {
    fetchMediaLibrary().then((rows) => {
      setItems(rows);
      setLoading(false);
    });
  }, []);

  const q = query.trim().toLowerCase();
  const filtered = items.filter(
    (m) =>
      !q ||
      m.title.toLowerCase().includes(q) ||
      m.subject.toLowerCase().includes(q) ||
      m.type.toLowerCase().includes(q)
  );

  const onUpload = (file: File | undefined) => {
    if (!file) return;
    setUploaded(`${file.name} (${Math.max(1, Math.round(file.size / 1024))} KB)`);
  };

  return (
    <div className="shell">
      <Sidebar />
      <div className="main-col">
        <header className="topbar">
          <div>
            <h1 className="page-title">สื่อการเรียนรู้</h1>
            <p className="page-sub">
              คลังสื่อสำหรับครู: ใบงาน สไลด์ วิดีโอ แบบทดสอบ (ข้อมูลสมมติ) — แชร์และดาวน์โหลดได้
            </p>
          </div>
          <div className="topbar-actions">
            <label className="btn btn-secondary btn-sm" style={{ cursor: "pointer" }}>
              📤 อัปโหลดสื่อ
              <input
                type="file"
                style={{ display: "none" }}
                onChange={(e) => onUpload(e.target.files?.[0])}
              />
            </label>
          </div>
        </header>
        <main className="content view-in">
          <div className="panel panel-pad" style={{ marginBottom: 14 }}>
            <input
              className="input"
              placeholder="ค้นหาสื่อ (ชื่อ/วิชา/ประเภท)..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              style={{ maxWidth: 380 }}
            />
            {uploaded && (
              <p className="section-hint" style={{ marginTop: 10 }}>
                ✅ อัปโหลดแล้ว (สาธิต): {uploaded} — ในระบบจริงไฟล์จะถูกเก็บในคลังสื่อของโรงเรียน
              </p>
            )}
          </div>
          {loading ? (
            <div className="panel panel-pad">กำลังโหลด...</div>
          ) : filtered.length === 0 ? (
            <div className="panel panel-pad">
              <p className="section-hint">ไม่พบสื่อที่ตรงกับคำค้น</p>
            </div>
          ) : (
            <div className="agent-grid">
              {filtered.map((m) => (
                <div className="panel panel-pad" key={m.id}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
                    <span className="badge badge-pending">{m.type}</span>
                    <span className="field-hint">{m.downloads} ดาวน์โหลด</span>
                  </div>
                  <h3 className="section-title" style={{ margin: "8px 0 4px", fontSize: "0.95rem" }}>
                    {m.title}
                  </h3>
                  <p className="section-hint">
                    วิชา {m.subject} · ชั้น {m.grade}
                  </p>
                </div>
              ))}
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