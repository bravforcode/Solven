"use client";

import { useEffect, useState } from "react";
import Sidebar from "@/components/Sidebar";
import { fetchProcurement, ProcurementData, ProcurementItem } from "@/lib/govdocs";

export default function ProcurementPage() {
  const [data, setData] = useState<ProcurementData>({ items: [], totalBudget: 0, fiscalYear: "", generatedBy: "" });
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ name: "", category: "", qty: "1", unitPrice: "", vendor: "" });

  useEffect(() => {
    fetchProcurement().then((rows) => {
      setData(rows);
      setLoading(false);
    });
  }, []);

  const statusBadge = (s: ProcurementItem["status"]) =>
    s === "จัดซื้อแล้ว" ? <span className="badge badge-approved">{s}</span> : s === "อนุมัติ" ? <span className="badge badge-pending">{s}</span> : <span className="badge badge-quarantined">{s}</span>;

  const addItem = (e: React.FormEvent) => {
    e.preventDefault();
    const qty = Number(form.qty) || 1;
    const unitPrice = Number(form.unitPrice) || 0;
    if (!form.name.trim() || unitPrice <= 0) return;
    const next: ProcurementItem = {
      id: `pr-${String(data.items.length + 1).padStart(3, "0")}`,
      name: form.name,
      category: form.category || "วัสดุ",
      qty,
      unitPrice,
      vendor: form.vendor || "รอเสนอราคา",
      budget: qty * unitPrice,
      status: "รอเสนอราคา",
    };
    setData((prev) => ({
      ...prev,
      items: [...prev.items, next],
      totalBudget: prev.totalBudget + next.budget,
    }));
    setForm({ name: "", category: "", qty: "1", unitPrice: "", vendor: "" });
  };

  return (
    <div className="shell">
      <Sidebar />
      <div className="main-col">
        <header className="topbar">
          <div>
            <h1 className="page-title">จัดซื้อจัดจ้าง</h1>
            <p className="page-sub">
              ทะเบียนรายการจัดซื้อ ปีงบประมาณ {data.fiscalYear} — วงเงินรวม ฿{data.totalBudget.toLocaleString()} (ข้อมูลสมมติ)
            </p>
          </div>
        </header>
        <main className="content view-in">
          <div className="panel panel-pad" style={{ marginBottom: 14 }}>
            <h2 className="section-title">เพิ่มรายการจัดซื้อ</h2>
            <form onSubmit={addItem} style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 10 }}>
              <input className="input" placeholder="รายการ" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} style={{ flex: 1, minWidth: 180 }} />
              <input className="input" placeholder="หมวด (วัสดุ/ครุภัณฑ์)" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} style={{ maxWidth: 150 }} />
              <input className="input" type="number" min={1} placeholder="จำนวน" value={form.qty} onChange={(e) => setForm({ ...form, qty: e.target.value })} style={{ maxWidth: 90 }} />
              <input className="input" type="number" min={0} placeholder="ราคาต่อหน่วย" value={form.unitPrice} onChange={(e) => setForm({ ...form, unitPrice: e.target.value })} style={{ maxWidth: 130 }} />
              <input className="input" placeholder="ผู้ขาย" value={form.vendor} onChange={(e) => setForm({ ...form, vendor: e.target.value })} style={{ maxWidth: 160 }} />
              <button type="submit" className="btn btn-primary">เพิ่ม</button>
            </form>
          </div>
          <div className="panel panel-pad">
            {loading ? (
              <p className="section-hint">กำลังโหลด...</p>
            ) : (
              <table className="table" style={{ width: "100%" }}>
                <thead>
                  <tr>
                    <th>รายการ</th>
                    <th>หมวด</th>
                    <th>จำนวน</th>
                    <th>ราคา/หน่วย</th>
                    <th>ผู้ขาย</th>
                    <th>วงเงิน</th>
                    <th>สถานะ</th>
                  </tr>
                </thead>
                <tbody>
                  {data.items.map((it) => (
                    <tr key={it.id}>
                      <td>{it.name}</td>
                      <td>{it.category}</td>
                      <td>{it.qty}</td>
                      <td>฿{it.unitPrice.toLocaleString()}</td>
                      <td>{it.vendor}</td>
                      <td>฿{it.budget.toLocaleString()}</td>
                      <td>{statusBadge(it.status)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
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