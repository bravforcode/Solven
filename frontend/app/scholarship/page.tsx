"use client";

import { useEffect, useState } from "react";
import Sidebar from "@/components/Sidebar";
import {
  fetchScholarship,
  ScholarshipData,
  ScholarshipProgram,
} from "@/lib/student";
import { LOCAL_REGISTRY } from "@/lib/student";

const NAME_MAP: Record<string, string> = Object.fromEntries(
  LOCAL_REGISTRY.map((s) => [s.id, s.name])
);

function eligibleBadge(status: string) {
  if (status === "อนุมัติ") return "badge badge-approved";
  if (status === "รอตรวจ") return "badge badge-pending";
  return "badge";
}

export default function ScholarshipPage() {
  const [data, setData] = useState<ScholarshipData>({
    programs: [],
    eligibleStudents: [],
  });
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string>("");

  useEffect(() => {
    fetchScholarship().then((rows) => {
      setData(rows);
      if (rows.programs.length > 0) setSelectedId(rows.programs[0].id);
      setLoading(false);
    });
  }, []);

  const selected: ScholarshipProgram | undefined = data.programs.find(
    (p) => p.id === selectedId
  );
  const eligible = data.eligibleStudents.filter((e) => e.programId === selectedId);

  return (
    <div className="shell">
      <Sidebar />
      <div className="main-col">
        <header className="topbar">
          <div>
            <h1 className="page-title">ทุนการศึกษา</h1>
            <p className="page-sub">
              รายการทุนและนักเรียนที่มีสิทธิ์สมัคร (ข้อมูลสมมติ PDPA)
            </p>
          </div>
          <div className="topbar-actions" />
        </header>
        <main className="content view-in">
          {loading ? (
            <div className="panel panel-pad">กำลังโหลด...</div>
          ) : (
            <>
              <div style={{ display: "flex", gap: 14, flexWrap: "wrap", marginBottom: 14 }}>
                {data.programs.map((p) => (
                  <div
                    key={p.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => setSelectedId(p.id)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") setSelectedId(p.id);
                    }}
                    className="panel panel-pad"
                    style={{
                      flex: "1 1 260px",
                      cursor: "pointer",
                      border: p.id === selectedId ? "2px solid var(--primary, #2563eb)" : undefined,
                    }}
                  >
                    <h2 className="section-title">{p.name}</h2>
                    <p className="section-hint">ผู้สนับสนุน: {p.sponsor}</p>
                    <div style={{ fontSize: 22, fontWeight: 700, margin: "8px 0" }}>
                      {p.amount.toLocaleString()} บาท
                    </div>
                    <p className="section-hint">หมดเขตรับสมัคร: {p.deadline}</p>
                    {p.id === selectedId && (
                      <span className="badge badge-pending" style={{ marginTop: 8 }}>
                        กำลังดู
                      </span>
                    )}
                  </div>
                ))}
              </div>

              {selected && (
                <div className="panel panel-pad">
                  <h2 className="section-title">
                    นักเรียนที่มีสิทธิ์ — {selected.name}{" "}
                    <span className="field-hint">({eligible.length} คน)</span>
                  </h2>
                  <p className="section-hint">เกณฑ์: {selected.criteria}</p>
                  {eligible.length === 0 ? (
                    <div className="empty">
                      <div className="empty-icon">🎓</div>
                      <div className="empty-title">ยังไม่มีรายชื่อนักเรียน</div>
                    </div>
                  ) : (
                    <table className="table" style={{ width: "100%", marginTop: 10 }}>
                      <thead>
                        <tr>
                          <th>รหัส</th>
                          <th>ชื่อนักเรียน</th>
                          <th>สถานะ</th>
                        </tr>
                      </thead>
                      <tbody>
                        {eligible.map((e) => (
                          <tr key={e.programId + e.studentId}>
                            <td>{e.studentId}</td>
                            <td>{NAME_MAP[e.studentId] ?? e.studentId}</td>
                            <td>
                              <span className={eligibleBadge(e.status)}>{e.status}</span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              )}
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
