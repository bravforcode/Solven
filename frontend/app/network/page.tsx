"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import Sidebar from "@/components/Sidebar";
import { fetchNetwork, SchoolNetwork } from "@/lib/community";

export default function NetworkPage() {
  const [data, setData] = useState<SchoolNetwork>({ members: [], events: [] });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchNetwork().then((d) => {
      setData(d);
      setLoading(false);
    });
  }, []);

  return (
    <div className="shell">
      <Sidebar />
      <div className="main-col">
        <header className="topbar">
          <div>
            <h1 className="page-title">เครือข่ายโรงเรียน</h1>
            <p className="page-sub">
              ความร่วมมือระหว่างโรงเรียนในเครือข่าย (ข้อมูลตัวอย่าง PDPA) — แบ่งปันทรัพยากรและจัดกิจกรรมร่วมกัน
            </p>
          </div>
          <div className="topbar-actions">
            <span className="badge">{data.members.length} โรงเรียน</span>
          </div>
        </header>
        <main className="content view-in">
          {loading ? (
            <div className="panel panel-pad">กำลังโหลด...</div>
          ) : (
            <>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))",
                  gap: 14,
                }}
              >
                {data.members.map((m) => (
                  <div className="panel panel-pad" key={m.id}>
                    <h2 className="section-title">{m.name}</h2>
                    <p className="section-hint">เขต{m.district} · เข้าร่วม {m.joined}</p>
                    <p className="field-label">นักเรียน {m.students} คน · ครู {m.teachers} คน</p>
                    <div style={{ marginTop: 8 }}>
                      {m.sharedResources.map((r) => (
                        <span className="badge" key={r} style={{ marginRight: 6, marginBottom: 6 }}>
                          {r}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
              <div className="panel panel-pad" style={{ marginTop: 14 }}>
                <h2 className="section-title">กิจกรรมเครือข่าย</h2>
                <table className="table" style={{ width: "100%", marginTop: 10 }}>
                  <thead>
                    <tr>
                      <th>วันที่</th>
                      <th>กิจกรรม</th>
                      <th>เจ้าภาพ</th>
                      <th>หัวข้อ</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.events.map((e) => (
                      <tr key={e.id}>
                        <td>{e.date}</td>
                        <td>{e.title}</td>
                        <td>{e.host}</td>
                        <td>{e.topic}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="section-hint">
                <Link href="/marketplace">→ ไปตลาดสื่อการเรียนการสอน</Link>
              </p>
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
