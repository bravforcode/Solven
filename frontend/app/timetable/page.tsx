"use client";

import { useEffect, useState } from "react";
import Sidebar from "@/components/Sidebar";
import { fetchTimetable, Timetable, TimetableCell } from "@/lib/teaching";

const ALL = "ทั้งหมด";

export default function TimetablePage() {
  const [tt, setTt] = useState<Timetable | null>(null);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<string>(ALL);

  useEffect(() => {
    fetchTimetable().then((data) => {
      setTt(data);
      setLoading(false);
    });
  }, []);

  const classes = tt
    ? Array.from(new Set(Object.values(tt.grid).flat().map((c) => c.className)))
    : [];

  const visible = (dayCells: TimetableCell[]): TimetableCell[] =>
    selected === ALL ? dayCells : dayCells.filter((c) => c.className === selected);

  return (
    <div className="shell">
      <Sidebar />
      <div className="main-col">
        <header className="topbar">
          <div>
            <h1 className="page-title">ตารางสอน</h1>
            <p className="page-sub">
              ตารางสอนประจำสัปดาห์ (ข้อมูลตัวอย่าง PDPA) — จันทร์–ศุกร์ × 8 คาบ
            </p>
          </div>
          <div className="topbar-actions">
            <button
              type="button"
              className={`btn btn-sm ${selected === ALL ? "btn-primary" : "btn-secondary"}`}
              onClick={() => setSelected(ALL)}
            >
              {ALL}
            </button>
            {classes.map((c) => (
              <button
                key={c}
                type="button"
                className={`btn btn-sm ${selected === c ? "btn-primary" : "btn-secondary"}`}
                onClick={() => setSelected(c)}
              >
                {c}
              </button>
            ))}
          </div>
        </header>
        <main className="content view-in">
          {loading || !tt ? (
            <div className="panel panel-pad">กำลังโหลด...</div>
          ) : (
            <div className="panel panel-pad">
              <table className="table" style={{ width: "100%" }}>
                <thead>
                  <tr>
                    <th style={{ width: 140 }}>คาบ</th>
                    {tt.days.map((d) => (
                      <th key={d}>{d}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {tt.periods.map((p) => (
                    <tr key={p.no}>
                      <td>
                        {p.no}. {p.time}
                      </td>
                      {tt.days.map((d) => {
                        const cell = visible(tt.grid[d]).find((c) => c.period === p.no);
                        return (
                          <td key={d}>
                            {cell ? (
                              <>
                                <strong>{cell.subject}</strong>
                                <br />
                                <span className="section-hint">
                                  {cell.className} · {cell.teacher}
                                </span>
                              </>
                            ) : (
                              "—"
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
              <p className="section-hint" style={{ marginTop: 10 }}>
                วิชาที่แสดงเป็นตัวอย่าง ครูผู้สอน/เวลาเรียนสามารถปรับได้ในระบบจริง
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
