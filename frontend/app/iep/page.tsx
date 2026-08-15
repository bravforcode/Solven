"use client";

import { useEffect, useState } from "react";
import Sidebar from "@/components/Sidebar";
import { fetchIep, IepPlan } from "@/lib/student";
import { LOCAL_REGISTRY } from "@/lib/student";

const NAME_MAP: Record<string, string> = Object.fromEntries(
  LOCAL_REGISTRY.map((s) => [s.id, s.name])
);

function planBadge(status: string) {
  if (status === "ดำเนินการ") return "badge badge-approved";
  return "badge badge-pending";
}

export default function IepPage() {
  const [plans, setPlans] = useState<IepPlan[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchIep().then((rows) => {
      setPlans(rows);
      setLoading(false);
    });
  }, []);

  return (
    <div className="shell">
      <Sidebar />
      <div className="main-col">
        <header className="topbar">
          <div>
            <h1 className="page-title">แผนช่วยเหลือรายบุคคล (IEP)</h1>
            <p className="page-sub">
              แผนการจัดการศึกษาเฉพาะบุคคลสำหรับนักเรียนที่ต้องการความช่วยเหลือ (ข้อมูลสมมติ PDPA)
            </p>
          </div>
          <div className="topbar-actions" />
        </header>
        <main className="content view-in">
          {loading ? (
            <div className="panel panel-pad">กำลังโหลด...</div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {plans.map((p) => (
                <div className="panel panel-pad" key={p.id}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                    <h2 className="section-title" style={{ margin: 0 }}>
                      {NAME_MAP[p.studentId] ?? p.studentId}{" "}
                      <span className="field-hint">({p.id})</span>
                    </h2>
                    <span className={planBadge(p.status)}>{p.status}</span>
                  </div>

                  <h3 className="section-title" style={{ fontSize: 15, marginTop: 14 }}>
                    ปัจจัยเสี่ยง
                  </h3>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 6 }}>
                    {p.riskFactors.map((r) => (
                      <span key={r} className="badge badge-pending">
                        {r}
                      </span>
                    ))}
                  </div>

                  <h3 className="section-title" style={{ fontSize: 15, marginTop: 14 }}>
                    เป้าหมาย
                  </h3>
                  <ul style={{ marginTop: 6, paddingLeft: 18 }}>
                    {p.goals.map((g) => (
                      <li key={g} style={{ marginBottom: 4 }}>
                        {g}
                      </li>
                    ))}
                  </ul>

                  <h3 className="section-title" style={{ fontSize: 15, marginTop: 14 }}>
                    มาตรการช่วยเหลือ
                  </h3>
                  <ul style={{ marginTop: 6, paddingLeft: 18 }}>
                    {p.supportMeasures.map((m) => (
                      <li key={m} style={{ marginBottom: 4 }}>
                        {m}
                      </li>
                    ))}
                  </ul>

                  <p className="section-hint" style={{ marginTop: 12 }}>
                    กำหนดทบทวนแผน: {p.reviewDate}
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
