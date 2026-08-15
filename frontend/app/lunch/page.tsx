"use client";

import { useEffect, useState } from "react";
import Sidebar from "@/components/Sidebar";
import { fetchLunch, LunchData } from "@/lib/staff";

interface Ingredient {
  name: string;
  amount: string;
}

export default function LunchPage() {
  const [data, setData] = useState<LunchData | null>(null);
  const [loading, setLoading] = useState(true);
  const [showIngredients, setShowIngredients] = useState(false);

  useEffect(() => {
    fetchLunch().then((d) => {
      setData(d);
      setLoading(false);
    });
  }, []);

  if (loading || !data) {
    return (
      <div className="shell">
        <Sidebar />
        <div className="main-col">
          <header className="topbar">
            <div>
              <h1 className="page-title">อาหารกลางวัน</h1>
              <p className="page-sub">กำลังโหลด...</p>
            </div>
          </header>
          <main className="content view-in">
            <div className="panel panel-pad">กำลังโหลด...</div>
          </main>
          <footer className="footer">
            Solven prototype — ข้อมูลทั้งหมดเป็นตัวอย่าง/อยู่ในเครื่องเท่านั้น ไม่มีข้อมูลนักเรียนจริง (PDPA)
          </footer>
        </div>
      </div>
    );
  }

  const days = data.weekMenu.length;
  const costPerHeadPerDay =
    days > 0 && data.studentCount > 0
      ? Math.round(data.weeklyCost / (days * data.studentCount))
      : 0;

  const ingredients: Ingredient[] = [
    { name: "ข้าวสารหอมมะลิ", amount: `${(data.studentCount * 0.12).toFixed(1)} กก.` },
    { name: "ผักสดรวม", amount: `${(data.studentCount * 0.2).toFixed(1)} กก.` },
    { name: "เนื้อสัตว์ / โปรตีน", amount: `${(data.studentCount * 0.1).toFixed(1)} กก.` },
    { name: "น้ำมันปรุงอาหาร", amount: `${(data.studentCount * 0.02).toFixed(1)} ลิตร` },
    { name: "ผลไม้ตามฤดูกาล", amount: `${data.studentCount} ผล` },
    { name: "เครื่องปรุงรส / ชุด", amount: "1 ชุดต่อสัปดาห์" },
  ];

  return (
    <div className="shell">
      <Sidebar />
      <div className="main-col">
        <header className="topbar">
          <div>
            <h1 className="page-title">อาหารกลางวัน</h1>
            <p className="page-sub">
              เมนูอาหารกลางวันประจำสัปดาห์และประมาณการงบประมาณ (ข้อมูลตัวอย่าง PDPA)
            </p>
          </div>
        </header>
        <main className="content view-in">
          <div className="panel panel-pad" style={{ marginBottom: 14 }}>
            <h2 className="section-title">เมนูประจำสัปดาห์</h2>
            <table className="table" style={{ width: "100%", marginTop: 10 }}>
              <thead>
                <tr>
                  <th>วัน</th>
                  <th>เมนู</th>
                  <th>ค่าวัตถุดิบ/วัน</th>
                  <th>ต่อหัว</th>
                </tr>
              </thead>
              <tbody>
                {data.weekMenu.map((d) => (
                  <tr key={d.day}>
                    <td>{d.day}</td>
                    <td>{d.menu.join(" + ")}</td>
                    <td>{d.ingredientCost.toLocaleString()} บาท</td>
                    <td>{d.perHead} บาท</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="panel panel-pad" style={{ marginBottom: 14 }}>
            <h2 className="section-title">สรุปงบประมาณ</h2>
            <div style={{ display: "flex", gap: 24, flexWrap: "wrap", marginTop: 10 }}>
              <div>
                <p className="section-hint">จำนวนนักเรียน</p>
                <p style={{ fontSize: 24, fontWeight: 700, margin: "4px 0 0" }}>
                  {data.studentCount.toLocaleString()} คน
                </p>
              </div>
              <div>
                <p className="section-hint">ค่าวัตถุดิบรวม/สัปดาห์</p>
                <p style={{ fontSize: 24, fontWeight: 700, margin: "4px 0 0" }}>
                  {data.weeklyCost.toLocaleString()} บาท
                </p>
              </div>
              <div>
                <p className="section-hint">เฉลี่ย/หัว/วัน</p>
                <p style={{ fontSize: 24, fontWeight: 700, margin: "4px 0 0" }}>
                  {costPerHeadPerDay} บาท
                </p>
              </div>
            </div>
            <div style={{ marginTop: 14 }}>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => setShowIngredients((v) => !v)}
              >
                {showIngredients ? "ซ่อนการคำนวณวัตถุดิบ" : "คำนวณวัตถุดิบ"}
              </button>
              {showIngredients && (
                <div style={{ marginTop: 12 }}>
                  <p className="section-hint">ประมาณการวัตถุดิบต่อสัปดาห์ (ตัวอย่าง):</p>
                  <ul style={{ margin: "6px 0 0", paddingLeft: 18 }}>
                    {ingredients.map((i) => (
                      <li key={i.name}>
                        {i.name}: <strong>{i.amount}</strong>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        </main>
        <footer className="footer">
          Solven prototype — ข้อมูลทั้งหมดเป็นตัวอย่าง/อยู่ในเครื่องเท่านั้น ไม่มีข้อมูลนักเรียนจริง (PDPA)
        </footer>
      </div>
    </div>
  );
}
