"use client";

import { FormEvent, useEffect, useState } from "react";
import Sidebar from "@/components/Sidebar";
import { fetchHomework, Homework, HomeworkStatus } from "@/lib/teaching";

const AI_DRAFT_TITLES = [
  "แบบฝึกหัดทบทวนเศษส่วน บทที่ 5 (ข้อ 1–15)",
  "อ่านจับใจความสำคัญ เรื่อง กระต่ายกับเต่า + ตอบคำถาม 5 ข้อ",
  "บันทึกการสังเกตวัฏจักรน้ำ รายสัปดาห์ (7 วัน)",
  "แบบฝึกหัดสมการเชิงเส้นตัวแปรเดียว ชุดที่ 2 (ข้อ 1–10)",
  "ค้นคว้าประวัติวันสำคัญทางพระพุทธศาสนา 1 หน้า",
];

const SUBJECTS = ["คณิตศาสตร์", "ภาษาไทย", "วิทยาศาสตร์", "ภาษาอังกฤษ", "สังคมศึกษา"];
const CLASSES = ["ป.4/1", "ป.5/1", "ม.1/1"];

const STATUS_LABEL: Record<HomeworkStatus, { text: string; cls: string }> = {
  assigned: { text: "รอส่ง", cls: "badge-pending" },
  submitted: { text: "ส่งแล้ว", cls: "badge" },
  graded: { text: "ตรวจแล้ว", cls: "badge-approved" },
};

export default function HomeworkPage() {
  const [items, setItems] = useState<Homework[]>([]);
  const [loading, setLoading] = useState(true);
  const [subject, setSubject] = useState(SUBJECTS[0]);
  const [className, setClassName] = useState(CLASSES[0]);
  const [title, setTitle] = useState("");
  const [due, setDue] = useState("");
  const [drafted, setDrafted] = useState(false);

  useEffect(() => {
    fetchHomework().then((rows) => {
      setItems(rows);
      setLoading(false);
    });
  }, []);

  const aiDraft = () => {
    setTitle(AI_DRAFT_TITLES[items.length % AI_DRAFT_TITLES.length]);
    setDrafted(true);
  };

  const addHomework = (e: FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    setItems((prev) => [
      {
        id: `local-${Date.now()}`,
        subject,
        className,
        title: title.trim(),
        dueDate: due || "ยังไม่กำหนด",
        status: "assigned",
      },
      ...prev,
    ]);
    setTitle("");
    setDue("");
    setDrafted(false);
  };

  return (
    <div className="shell">
      <Sidebar />
      <div className="main-col">
        <header className="topbar">
          <div>
            <h1 className="page-title">การบ้าน</h1>
            <p className="page-sub">
              รายการการบ้านตัวอย่าง (ข้อมูลสมมติ PDPA) — สั่งงาน ดูสถานะ และให้ AI ร่างการบ้าน
            </p>
          </div>
          <div className="topbar-actions">
            <span className="badge badge-pending">รอส่ง</span>
            <span className="badge">ส่งแล้ว</span>
            <span className="badge badge-approved">ตรวจแล้ว</span>
          </div>
        </header>
        <main className="content view-in">
          <div className="panel panel-pad" style={{ marginBottom: 14 }}>
            <h2 className="section-title">สั่งการบ้านใหม่</h2>
            <form onSubmit={addHomework}>
              <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                <div className="field">
                  <label className="field-label">วิชา</label>
                  <select className="select" value={subject} onChange={(e) => setSubject(e.target.value)}>
                    {SUBJECTS.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="field">
                  <label className="field-label">ชั้นเรียน</label>
                  <select className="select" value={className} onChange={(e) => setClassName(e.target.value)}>
                    {CLASSES.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="field" style={{ flex: 1, minWidth: 260 }}>
                  <label className="field-label">หัวข้อการบ้าน</label>
                  <input
                    className="input"
                    style={{ width: "100%" }}
                    placeholder="เช่น แบบฝึกหัดเศษส่วน บทที่ 5"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                  />
                </div>
                <div className="field">
                  <label className="field-label">กำหนดส่ง</label>
                  <input type="date" className="input" value={due} onChange={(e) => setDue(e.target.value)} />
                </div>
              </div>
              <div style={{ display: "flex", gap: 10, marginTop: 10 }}>
                <button type="submit" className="btn btn-primary">
                  เพิ่มการบ้าน
                </button>
                <button type="button" className="btn btn-secondary" onClick={aiDraft}>
                  AI ร่างการบ้าน
                </button>
                {drafted && (
                  <span className="section-hint" style={{ alignSelf: "center" }}>
                    ✨ ร่างโดย AI (สาธิต) — ตรวจทานก่อนสั่งงานได้
                  </span>
                )}
              </div>
            </form>
          </div>

          {loading ? (
            <div className="panel panel-pad">กำลังโหลด...</div>
          ) : items.length === 0 ? (
            <div className="panel panel-pad">
              <div className="empty">
                <div className="empty-icon">📭</div>
                <div className="empty-title">ยังไม่มีการบ้าน</div>
                <div className="empty-text">สั่งการบ้านใหม่ด้วยฟอร์มด้านบน</div>
              </div>
            </div>
          ) : (
            items.map((h) => (
              <div className="panel panel-pad" key={h.id} style={{ marginBottom: 12 }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                  <div>
                    <h2 className="section-title" style={{ marginBottom: 4 }}>
                      {h.title}
                    </h2>
                    <p className="section-hint">
                      {h.subject} · ชั้น {h.className} · กำหนดส่ง {h.dueDate}
                    </p>
                  </div>
                  <span className={`badge ${STATUS_LABEL[h.status].cls}`}>{STATUS_LABEL[h.status].text}</span>
                </div>
              </div>
            ))
          )}
        </main>
        <footer className="footer">
          Solven prototype — ข้อมูลทั้งหมดเป็นตัวอย่าง/อยู่ในเครื่องเท่านั้น ไม่มีข้อมูลนักเรียนจริง (PDPA)
        </footer>
      </div>
    </div>
  );
}
