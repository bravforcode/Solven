"use client";

import { FormEvent, useEffect, useState } from "react";
import Sidebar from "@/components/Sidebar";
import { fetchBudget, BudgetData } from "@/lib/staff";

function conditionBadge(condition: string): string {
  if (condition === "ดี") return "badge badge-approved";
  if (condition === "ซ่อม") return "badge badge-pending";
  return "badge";
}

interface Requisition {
  id: string;
  itemName: string;
  quantity: number;
}

export default function BudgetPage() {
  const [data, setData] = useState<BudgetData | null>(null);
  const [loading, setLoading] = useState(true);
  const [itemId, setItemId] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [requisitions, setRequisitions] = useState<Requisition[]>([]);
  const [nextId, setNextId] = useState(1);

  useEffect(() => {
    fetchBudget().then((d) => {
      setData(d);
      setLoading(false);
      if (d.inventory.length > 0) setItemId(d.inventory[0].id);
    });
  }, []);

  if (loading || !data) {
    return (
      <div className="shell">
        <Sidebar />
        <div className="main-col">
          <header className="topbar">
            <div>
              <h1 className="page-title">งบประมาณ / พัสดุ</h1>
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

  const submitRequisition = (e: FormEvent) => {
    e.preventDefault();
    const item = data.inventory.find((i) => i.id === itemId);
    if (!item) return;
    const n = Math.max(1, parseInt(quantity, 10) || 1);
    setRequisitions((rows) => [
      ...rows,
      { id: `req-${nextId}`, itemName: item.name, quantity: n },
    ]);
    setNextId((v) => v + 1);
    setQuantity("1");
  };

  return (
    <div className="shell">
      <Sidebar />
      <div className="main-col">
        <header className="topbar">
          <div>
            <h1 className="page-title">งบประมาณ / พัสดุ</h1>
            <p className="page-sub">
              ติดตามการใช้จ่ายงบประมาณและสถานะพัสดุของโรงเรียน (ข้อมูลตัวอย่าง PDPA)
            </p>
          </div>
        </header>
        <main className="content view-in">
          <div className="panel panel-pad" style={{ marginBottom: 14 }}>
            <h2 className="section-title">งบประมาณตามหมวดรายจ่าย</h2>
            <table className="table" style={{ width: "100%", marginTop: 10 }}>
              <thead>
                <tr>
                  <th>หมวดรายจ่าย</th>
                  <th>จัดสรร</th>
                  <th>ใช้ไป</th>
                  <th style={{ width: "30%" }}>อัตราการใช้</th>
                </tr>
              </thead>
              <tbody>
                {data.budget.map((b) => {
                  const pct = b.allocated > 0 ? Math.round((b.spent / b.allocated) * 100) : 0;
                  return (
                    <tr key={b.category}>
                      <td>{b.category}</td>
                      <td>{b.allocated.toLocaleString()} บาท</td>
                      <td>{b.spent.toLocaleString()} บาท</td>
                      <td>
                        <div
                          style={{
                            background: "#e5e7eb",
                            borderRadius: 6,
                            height: 12,
                            width: "100%",
                            overflow: "hidden",
                          }}
                        >
                          <div
                            style={{
                              width: `${pct}%`,
                              height: "100%",
                              background: pct >= 90 ? "#dc2626" : "#2563eb",
                              borderRadius: 6,
                            }}
                          />
                        </div>
                        <span className="section-hint">{pct}%</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="panel panel-pad" style={{ marginBottom: 14 }}>
            <h2 className="section-title">ทะเบียนพัสดุ</h2>
            <table className="table" style={{ width: "100%", marginTop: 10 }}>
              <thead>
                <tr>
                  <th>รายการ</th>
                  <th>ประเภท</th>
                  <th>จำนวน</th>
                  <th>สภาพ</th>
                </tr>
              </thead>
              <tbody>
                {data.inventory.map((i) => (
                  <tr key={i.id}>
                    <td>{i.name}</td>
                    <td>{i.category}</td>
                    <td>{i.quantity}</td>
                    <td>
                      <span className={conditionBadge(i.condition)}>{i.condition}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="panel panel-pad">
            <h2 className="section-title">เบิกวัสดุ</h2>
            <form
              onSubmit={submitRequisition}
              style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "flex-end", marginTop: 10 }}
            >
              <div className="field">
                <label className="field-label">รายการวัสดุ</label>
                <select
                  className="select"
                  value={itemId}
                  onChange={(e) => setItemId(e.target.value)}
                >
                  {data.inventory.map((i) => (
                    <option key={i.id} value={i.id}>
                      {i.name} (คงเหลือ {i.quantity})
                    </option>
                  ))}
                </select>
              </div>
              <div className="field">
                <label className="field-label">จำนวน</label>
                <input
                  type="number"
                  min={1}
                  className="input"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  style={{ maxWidth: 100 }}
                />
              </div>
              <button type="submit" className="btn btn-primary btn-sm">
                เบิกวัสดุ
              </button>
            </form>
            {requisitions.length > 0 && (
              <div style={{ marginTop: 12 }}>
                <p className="section-hint">รายการเบิก (ตัวอย่าง):</p>
                <ul style={{ margin: "6px 0 0", paddingLeft: 18 }}>
                  {requisitions.map((r) => (
                    <li key={r.id}>
                      {r.itemName} × {r.quantity} — รอผู้อำนวยการอนุมัติ
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </main>
        <footer className="footer">
          Solven prototype — ข้อมูลทั้งหมดเป็นตัวอย่าง/อยู่ในเครื่องเท่านั้น ไม่มีข้อมูลนักเรียนจริง (PDPA)
        </footer>
      </div>
    </div>
  );
}
