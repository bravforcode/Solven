"use client";

import { useEffect, useState } from "react";
import Sidebar from "@/components/Sidebar";
import { fetchPrincipal, PrincipalResult } from "@/lib/ai";

const insightBadge = (t: string) =>
  t === "จุดแข็ง" ? "badge badge-approved" : t === "จุดเสี่ยง" ? "badge" : "badge badge-pending";

export default function PrincipalPage() {
  const [data, setData] = useState<PrincipalResult | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPrincipal().then((rows) => {
      setData(rows);
      setLoading(false);
    });
  }, []);

  return (
    <div className="shell">
      <Sidebar />
      <div className="main-col">
        <header className="topbar">
          <div>
            <h1 className="page-title">ผู้ช่วยผู้บริหาร</h1>
            <p className="page-sub">
              สรุปภาพรวมโรงเรียน แนวโน้ม และข้อควรเฝ้าระวัง (ข้อมูลสมมติ PDPA)
            </p>
          </div>
        </header>
        <main className="content view-in">
          {loading || !data ? (
            <div className="panel panel-pad">กำลังโหลด...</div>
          ) : (
            <>
              <div style={{ display: "flex", gap: 14, flexWrap: "wrap", marginBottom: 14 }}>
                <div className="panel panel-pad" style={{ flex: "1 1 140px", minWidth: 140 }}>
                  <p className="section-hint">นักเรียนทั้งหมด</p>
                  <h2 className="section-title">{data.summary.enrollment} คน</h2>
                </div>
                <div className="panel panel-pad" style={{ flex: "1 1 140px", minWidth: 140 }}>
                  <p className="section-hint">ผลการเรียนเฉลี่ย</p>
                  <h2 className="section-title">GPA {data.summary.avgGpa}</h2>
                </div>
                <div className="panel panel-pad" style={{ flex: "1 1 140px", minWidth: 140 }}>
                  <p className="section-hint">อัตราการมาเรียน</p>
                  <h2 className="section-title">{data.summary.attendancePct}%</h2>
                </div>
                <div className="panel panel-pad" style={{ flex: "1 1 140px", minWidth: 140 }}>
                  <p className="section-hint">งบประมาณที่ใช้</p>
                  <h2 className="section-title">{data.summary.budgetUsedPct}%</h2>
                </div>
                <div className="panel panel-pad" style={{ flex: "1 1 140px", minWidth: 140 }}>
                  <p className="section-hint">บุคลากร</p>
                  <h2 className="section-title">{data.summary.staffCount} คน</h2>
                </div>
              </div>

              <div className="panel panel-pad" style={{ marginBottom: 14 }}>
                <h2 className="section-title">ข้อมูลเชิงลึก</h2>
                <ul style={{ margin: "10px 0 0 0", padding: 0 }}>
                  {data.insights.map((ins, i) => (
                    <li key={`${ins.type}-${i}`} style={{ listStyle: "none", marginBottom: 10 }}>
                      <span className={insightBadge(ins.type)} style={{ marginRight: 8 }}>
                        {ins.type}
                      </span>
                      {ins.text}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="panel panel-pad">
                <h2 className="section-title">การแจ้งเตือน</h2>
                <ul style={{ margin: "10px 0 0 18px", padding: 0 }}>
                  {data.alerts.map((a) => (
                    <li key={a} style={{ marginBottom: 6 }}>
                      ⚠️ {a}
                    </li>
                  ))}
                </ul>
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
