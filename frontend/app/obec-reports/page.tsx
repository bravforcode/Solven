"use client";

import { useEffect, useState } from "react";
import Sidebar from "@/components/Sidebar";
import { fetchObecReports, ObecReports, ObecReport } from "@/lib/govdocs";
import { downloadCsv } from "@/lib/csv";

export default function ObecReportsPage() {
  const [data, setData] = useState<ObecReports>({ reports: [], school: "", obecRegion: "", generatedBy: "" });
  const [loading, setLoading] = useState(true);
  const [generated, setGenerated] = useState<Record<string, string>>({});

  useEffect(() => {
    fetchObecReports().then((rows) => {
      setData(rows);
      setLoading(false);
    });
  }, []);

  const categoryBadge = (c: ObecReport["category"]) =>
    c === "DMC" ? <span className="badge badge-quarantined">{c}</span> : c === "ข้อมูลพื้นฐาน" ? <span className="badge badge-pending">{c}</span> : <span className="badge badge-approved">{c}</span>;

  const statusBadge = (s: string) =>
    s === "ส่งแล้ว" ? <span className="badge badge-approved">{s}</span> : <span className="badge badge-quarantined">{s}</span>;

  const exportCsv = () => {
    const rows = data.reports.map((r) => ({
      รายงาน: r.name,
      หมวด: r.category,
      "รอบระยะเวลา": r.period,
      สถานะ: r.status,
      "จำนวนนักเรียน": r.summary.students,
      "จำนวนครู": r.summary.teachers,
      "จำนวนห้อง": r.summary.rooms,
      "งบประมาณ": r.summary.budget,
    }));
    downloadCsv("solven-obec-reports", rows);
  };

  return (
    <div className="shell">
      <Sidebar />
      <div className="main-col">
        <header className="topbar">
          <div>
            <h1 className="page-title">รายงาน สพฐ. / DMC</h1>
            <p className="page-sub">
              รายงานที่ต้องส่งหน่วยงานต้นสังกัด: ข้อมูลนักเรียนรายบุคคล (DMC) ข้อมูลพื้นฐาน ผลสัมฤทธิ์
            </p>
          </div>
          <div className="topbar-actions">
            <button type="button" className="btn btn-secondary btn-sm" onClick={exportCsv}>
              ดาวน์โหลด CSV
            </button>
          </div>
        </header>
        <main className="content view-in">
          {loading ? (
            <div className="panel panel-pad">กำลังโหลด...</div>
          ) : (
            <>
              <div className="panel panel-pad" style={{ marginBottom: 14 }}>
                <h2 className="section-title">{data.school}</h2>
                <p className="section-hint">สังกัด: {data.obecRegion} · สร้างโดย {data.generatedBy}</p>
                <div style={{ display: "flex", gap: 18, flexWrap: "wrap", marginTop: 10 }}>
                  <div><div className="page-title" style={{ fontSize: 22 }}>{data.reports[0]?.summary.students ?? 0}</div><span className="field-hint">นักเรียน</span></div>
                  <div><div className="page-title" style={{ fontSize: 22 }}>{data.reports[0]?.summary.teachers ?? 0}</div><span className="field-hint">ครู</span></div>
                  <div><div className="page-title" style={{ fontSize: 22 }}>{data.reports[0]?.summary.rooms ?? 0}</div><span className="field-hint">ห้องเรียน</span></div>
                  <div><div className="page-title" style={{ fontSize: 22 }}>฿{(data.reports[0]?.summary.budget ?? 0).toLocaleString()}</div><span className="field-hint">งบประมาณ</span></div>
                </div>
              </div>
              {data.reports.map((r) => (
                <div className="panel panel-pad" key={r.id} style={{ marginBottom: 14 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "center" }}>
                    <div>
                      <strong>{r.name}</strong>
                      <span className="field-hint" style={{ marginLeft: 8 }}>{r.period}</span>
                    </div>
                    <div style={{ display: "flex", gap: 6 }}>
                      {categoryBadge(r.category)}
                      {statusBadge(r.status)}
                    </div>
                  </div>
                  <p className="section-hint" style={{ marginTop: 8 }}>
                    นักเรียน {r.summary.students} · ครู {r.summary.teachers} · ห้อง {r.summary.rooms} · งบ ฿{r.summary.budget.toLocaleString()} · สร้างเมื่อ {r.generatedAt}
                  </p>
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    style={{ marginTop: 8 }}
                    onClick={() => setGenerated((prev) => ({ ...prev, [r.id]: `รายงาน ${r.name} (${r.period}) สร้างสำเร็จแล้ว — ${new Date().toLocaleString("th-TH")} (สาธิต)` }))}
                  >
                    สร้างรายงาน
                  </button>
                  {generated[r.id] && <p className="section-hint" style={{ marginTop: 8 }}>✅ {generated[r.id]}</p>}
                </div>
              ))}
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