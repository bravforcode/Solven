"use client";

import { useEffect, useState } from "react";
import Sidebar from "@/components/Sidebar";
import { fetchBehavior, BehaviorResult } from "@/lib/ai";

const trendBadge = (t: string) =>
  t === "ดีขึ้น" ? "badge badge-approved" : t === "ทรงตัว" ? "badge badge-pending" : "badge";

export default function BehaviorPage() {
  const [data, setData] = useState<BehaviorResult | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchBehavior().then((rows) => {
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
            <h1 className="page-title">วิเคราะห์พฤติกรรม</h1>
            <p className="page-sub">
              ติดตามแนวโน้มพฤติกรรมและการเรียนของนักเรียน (ข้อมูลสมมติ PDPA)
            </p>
          </div>
        </header>
        <main className="content view-in">
          {loading || !data ? (
            <div className="panel panel-pad">กำลังโหลด...</div>
          ) : (
            <>
              <div style={{ display: "flex", gap: 14, flexWrap: "wrap", marginBottom: 14 }}>
                {data.students.map((s) => (
                  <div key={s.id} className="panel panel-pad" style={{ flex: "1 1 260px", minWidth: 260 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <h2 className="section-title">{s.name}</h2>
                      <span className={trendBadge(s.trend)}>{s.trend}</span>
                    </div>
                    <p className="section-hint" style={{ marginTop: 6 }}>
                      การมาเรียน {s.attendancePct}% · {s.gradeTrend}
                    </p>
                    <p style={{ marginTop: 8 }}>{s.summary}</p>
                    {s.flags.length > 0 && (
                      <div style={{ marginTop: 8 }}>
                        {s.flags.map((f) => (
                          <span key={f} className="badge" style={{ marginRight: 6 }}>
                            {f}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
              <div className="panel panel-pad">
                <h2 className="section-title">ภาพรวมชั้นเรียน</h2>
                <ul style={{ margin: "10px 0 0 18px", padding: 0 }}>
                  {data.insights.map((ins) => (
                    <li key={ins} style={{ marginBottom: 6 }}>
                      {ins}
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
