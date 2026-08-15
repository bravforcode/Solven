"use client";

import { useEffect, useState } from "react";
import Sidebar from "@/components/Sidebar";
import { fetchBadges, BadgesData, Badge } from "@/lib/community";

export default function BadgesPage() {
  const [data, setData] = useState<BadgesData>({ students: [], leaderboard: [] });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchBadges().then((d) => {
      setData(d);
      setLoading(false);
    });
  }, []);

  const legend: Badge[] = data.students
    .flatMap((s) => s.badges)
    .filter((b) => b.earned)
    .filter((b, i, arr) => arr.findIndex((x) => x.name === b.name) === i);

  return (
    <div className="shell">
      <Sidebar />
      <div className="main-col">
        <header className="topbar">
          <div>
            <h1 className="page-title">เกมมิฟิเคชัน</h1>
            <p className="page-sub">
              คะแนนและตรารางวัลของนักเรียน (ข้อมูลตัวอย่าง PDPA) — แรงจูงใจในการเรียนรู้
            </p>
          </div>
          <div className="topbar-actions">
            <span className="badge">{data.leaderboard.length} อันดับ</span>
          </div>
        </header>
        <main className="content view-in">
          {loading ? (
            <div className="panel panel-pad">กำลังโหลด...</div>
          ) : (
            <>
              <div className="panel panel-pad">
                <h2 className="section-title">ตารางอันดับ</h2>
                <table className="table" style={{ width: "100%", marginTop: 10 }}>
                  <thead>
                    <tr>
                      <th>อันดับ</th>
                      <th>ชื่อ</th>
                      <th>คะแนน</th>
                      <th>ตรารางวัล</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.leaderboard.map((row) => (
                      <tr key={row.id}>
                        <td>{row.rank === 1 ? "🥇" : row.rank === 2 ? "🥈" : row.rank === 3 ? "🥉" : row.rank}</td>
                        <td>{row.name}</td>
                        <td>{row.points}</td>
                        <td>
                          {row.badges.map((b) => (
                            <span key={b.name} title={b.name}>
                              {b.icon}{" "}
                            </span>
                          ))}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="panel panel-pad" style={{ marginTop: 14 }}>
                <h2 className="section-title">ตรารางวัลทั้งหมด</h2>
                <div style={{ marginTop: 8 }}>
                  {legend.map((b) => (
                    <span className="badge" key={b.name} style={{ marginRight: 8, marginBottom: 6 }}>
                      {b.icon} {b.name}
                    </span>
                  ))}
                </div>
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
