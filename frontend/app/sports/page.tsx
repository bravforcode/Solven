"use client";

import { useEffect, useState } from "react";
import Sidebar from "@/components/Sidebar";
import { fetchSports, SportsData, SportsTeam } from "@/lib/community";

export default function SportsPage() {
  const [data, setData] = useState<SportsData>({ teams: [], events: [] });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSports().then((d) => {
      setData(d);
      setLoading(false);
    });
  }, []);

  const ranked = [...data.teams].sort((a, b) => b.score - a.score);

  const addScore = (id: string) => {
    setData((d) => ({
      ...d,
      teams: d.teams.map((t) => (t.id === id ? { ...t, score: t.score + 10 } : t)),
    }));
  };

  return (
    <div className="shell">
      <Sidebar />
      <div className="main-col">
        <header className="topbar">
          <div>
            <h1 className="page-title">กีฬาสี</h1>
            <p className="page-sub">
              ตารางคะแนนคณะสีและผลการแข่งขัน (ข้อมูลตัวอย่าง PDPA)
            </p>
          </div>
          <div className="topbar-actions">
            <span className="badge">ประจำปี 2569</span>
          </div>
        </header>
        <main className="content view-in">
          {loading ? (
            <div className="panel panel-pad">กำลังโหลด...</div>
          ) : (
            <>
              <div className="panel panel-pad">
                <h2 className="section-title">ตารางคะแนน</h2>
                <table className="table" style={{ width: "100%", marginTop: 10 }}>
                  <thead>
                    <tr>
                      <th>อันดับ</th>
                      <th>คณะ</th>
                      <th>คะแนน</th>
                      <th>อัปเดต (ตัวอย่าง)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ranked.map((t: SportsTeam, i: number) => (
                      <tr key={t.id}>
                        <td>{i + 1}</td>
                        <td>{t.name}</td>
                        <td>{t.score}</td>
                        <td>
                          <button
                            type="button"
                            className="btn btn-secondary btn-sm"
                            onClick={() => addScore(t.id)}
                          >
                            +10 คะแนน
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="panel panel-pad" style={{ marginTop: 14 }}>
                <h2 className="section-title">ผลการแข่งขัน</h2>
                <table className="table" style={{ width: "100%", marginTop: 10 }}>
                  <thead>
                    <tr>
                      <th>วันที่</th>
                      <th>ประเภท</th>
                      <th>ทีม</th>
                      <th>ผล</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.events.map((e) => (
                      <tr key={e.id}>
                        <td>{e.date}</td>
                        <td>{e.sport}</td>
                        <td>{e.teams}</td>
                        <td>{e.result}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
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
