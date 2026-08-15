"use client";

import { useEffect, useState } from "react";
import Sidebar from "@/components/Sidebar";
import { fetchCurriculumMap, CurriculumSubject, UnitStatus } from "@/lib/teaching";

const STATUS_LABEL: Record<UnitStatus, { text: string; cls: string }> = {
  plan: { text: "วางแผน", cls: "badge-pending" },
  teaching: { text: "กำลังสอน", cls: "badge" },
  done: { text: "เสร็จแล้ว", cls: "badge-approved" },
};

export default function CurriculumPage() {
  const [subjects, setSubjects] = useState<CurriculumSubject[]>([]);
  const [loading, setLoading] = useState(true);
  const [active, setActive] = useState<string>("");

  useEffect(() => {
    fetchCurriculumMap().then((rows) => {
      setSubjects(rows);
      if (rows.length > 0) setActive(rows[0].subject);
      setLoading(false);
    });
  }, []);

  const current = subjects.find((s) => s.subject === active) ?? null;
  const doneUnits = current ? current.units.filter((u) => u.status === "done").length : 0;
  const totalUnits = current ? current.units.length : 0;
  const progress = totalUnits > 0 ? Math.round((doneUnits / totalUnits) * 100) : 0;

  return (
    <div className="shell">
      <Sidebar />
      <div className="main-col">
        <header className="topbar">
          <div>
            <h1 className="page-title">แผนการเรียนรู้รายปี</h1>
            <p className="page-sub">
              แผนการเรียนรู้รายปีตัวอย่าง (ข้อมูลสมมติ PDPA) — หน่วยการเรียนรู้ + ตัวชี้วัด + ความคืบหน้า
            </p>
          </div>
          <div className="topbar-actions">
            {subjects.map((s) => (
              <button
                key={s.subject}
                type="button"
                className={`btn btn-sm ${active === s.subject ? "btn-primary" : "btn-secondary"}`}
                onClick={() => setActive(s.subject)}
              >
                {s.subject}
              </button>
            ))}
          </div>
        </header>
        <main className="content view-in">
          {loading ? (
            <div className="panel panel-pad">กำลังโหลด...</div>
          ) : !current ? (
            <div className="panel panel-pad">
              <div className="empty">
                <div className="empty-icon">🗂️</div>
                <div className="empty-title">ไม่พบแผนการเรียนรู้</div>
                <div className="empty-text">ลองเลือกวิชาอื่นจากปุ่มด้านบน</div>
              </div>
            </div>
          ) : (
            <div className="panel panel-pad">
              <h2 className="section-title">วิชา {current.subject}</h2>
              <div style={{ margin: "12px 0" }}>
                <div
                  style={{
                    height: 10,
                    borderRadius: 5,
                    background: "rgba(0,0,0,0.08)",
                    overflow: "hidden",
                  }}
                >
                  <div
                    style={{
                      height: "100%",
                      width: `${progress}%`,
                      background: "#16a34a",
                      transition: "width 0.3s ease",
                    }}
                  />
                </div>
                <p className="section-hint" style={{ marginTop: 6 }}>
                  ความคืบหน้า: เรียนจบ {doneUnits}/{totalUnits} หน่วย ({progress}%)
                </p>
              </div>
              <table className="table" style={{ width: "100%" }}>
                <thead>
                  <tr>
                    <th>หน่วยการเรียนรู้</th>
                    <th>ตัวชี้วัด</th>
                    <th>สัปดาห์</th>
                    <th>สถานะ</th>
                  </tr>
                </thead>
                <tbody>
                  {current.units.map((u, i) => (
                    <tr key={`${current.subject}-${i}`}>
                      <td>{u.title}</td>
                      <td>{u.indicators.join(", ")}</td>
                      <td>{u.weeks}</td>
                      <td>
                        <span className={`badge ${STATUS_LABEL[u.status].cls}`}>
                          {STATUS_LABEL[u.status].text}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <p className="section-hint" style={{ marginTop: 10 }}>
                ตัวชี้วัดอ้างอิงหลักสูตรแกนกลางการศึกษาขั้นพื้นฐาน 2551 (ตัวอย่าง)
              </p>
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
