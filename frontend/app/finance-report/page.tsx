"use client";

import { useEffect, useState } from "react";
import Sidebar from "@/components/Sidebar";
import { fetchFinance, FinanceSummary } from "@/lib/finance";
import { downloadCsv } from "@/lib/csv";

const fmt = (n: number) => `${n.toLocaleString("th-TH")} บาท`;

const PERIODS = ["ไตรมาส 1/2569", "ไตรมาส 2/2569", "ไตรมาส 3/2569", "ปีการศึกษา 2569"];

export default function FinanceReportPage() {
  const [finance, setFinance] = useState<FinanceSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState(PERIODS[2]);

  useEffect(() => {
    fetchFinance().then((data) => {
      setFinance(data);
      setLoading(false);
    });
  }, []);

  const exportCsv = () => {
    const incomeRows = (finance?.income ?? []).map((c) => ({
      ประเภท: "รายรับ",
      หมวด: c.category,
      จำนวนเงิน: c.amount,
    }));
    const expenseRows = (finance?.expense ?? []).map((c) => ({
      ประเภท: "รายจ่าย",
      หมวด: c.category,
      จำนวนเงิน: c.amount,
    }));
    const monthRows = (finance?.months ?? []).map((m) => ({
      เดือน: m.month,
      "รายรับ (บาท)": m.income,
      "รายจ่าย (บาท)": m.expense,
    }));
    downloadCsv("solven-finance-report", [...incomeRows, ...expenseRows, ...monthRows]);
  };

  const maxMonth = Math.max(
    1,
    ...(finance?.months ?? []).map((m) => Math.max(m.income, m.expense))
  );
  const barHeight = (amount: number) => `${Math.round((amount / maxMonth) * 100)}%`;

  return (
    <div className="shell">
      <Sidebar />
      <div className="main-col">
        <header className="topbar">
          <div>
            <h1 className="page-title">รายงานการเงิน</h1>
            <p className="page-sub">
              สรุปรายรับ-รายจ่ายของโรงเรียนตัวอย่าง (ข้อมูลสมมติ PDPA) — รายหมวดและรายเดือน
            </p>
          </div>
          <div className="topbar-actions">
            <button type="button" className="btn btn-secondary btn-sm" onClick={exportCsv}>
              ดาวน์โหลด CSV
            </button>
          </div>
        </header>
        <main className="content view-in">
          <div className="panel panel-pad" style={{ marginBottom: 14 }}>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {PERIODS.map((p) => (
                <button
                  key={p}
                  type="button"
                  className={p === period ? "btn btn-primary btn-sm" : "btn btn-secondary btn-sm"}
                  onClick={() => setPeriod(p)}
                >
                  {p}
                </button>
              ))}
            </div>
            <p className="section-hint" style={{ marginTop: 8 }}>
              โหมดสาธิต: ทุกช่วงเวลาแสดงชุดข้อมูลตัวอย่างเดียวกัน ({finance?.period})
            </p>
          </div>

          {loading ? (
            <div className="panel panel-pad">กำลังโหลด...</div>
          ) : (
            <>
              <div className="panel panel-pad" style={{ marginBottom: 14 }}>
                <h2 className="section-title">ยอดคงเหลือ (Balance)</h2>
                <p className="section-hint" style={{ fontSize: 26, fontWeight: 600, marginTop: 6 }}>
                  {fmt(finance?.balance ?? 0)}
                </p>
                <p className="section-hint">
                  รายรับรวม {fmt(finance?.incomeTotal ?? 0)} · รายจ่ายรวม {fmt(finance?.expenseTotal ?? 0)}
                </p>
              </div>

              <div className="panel panel-pad" style={{ marginBottom: 14 }}>
                <h2 className="section-title">รายรับรายหมวด</h2>
                <table className="table" style={{ width: "100%", marginTop: 10 }}>
                  <thead>
                    <tr>
                      <th>หมวด</th>
                      <th>จำนวนเงิน</th>
                    </tr>
                  </thead>
                  <tbody>
                    {finance?.income.map((c) => (
                      <tr key={c.category}>
                        <td>{c.category}</td>
                        <td>{fmt(c.amount)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="panel panel-pad" style={{ marginBottom: 14 }}>
                <h2 className="section-title">รายจ่ายรายหมวด</h2>
                <table className="table" style={{ width: "100%", marginTop: 10 }}>
                  <thead>
                    <tr>
                      <th>หมวด</th>
                      <th>จำนวนเงิน</th>
                    </tr>
                  </thead>
                  <tbody>
                    {finance?.expense.map((c) => (
                      <tr key={c.category}>
                        <td>{c.category}</td>
                        <td>{fmt(c.amount)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="panel panel-pad" style={{ marginBottom: 14 }}>
                <h2 className="section-title">รายรับ-รายจ่าย 6 เดือน</h2>
                <div style={{ display: "flex", alignItems: "flex-end", gap: 14, height: 180, marginTop: 14 }}>
                  {finance?.months.map((m) => (
                    <div key={m.month} style={{ display: "flex", flexDirection: "column", alignItems: "center", flex: 1, height: "100%" }}>
                      <div style={{ display: "flex", alignItems: "flex-end", gap: 4, flex: 1, width: "100%", justifyContent: "center" }}>
                        <div
                          title={`รายรับ ${fmt(m.income)}`}
                          style={{ width: 22, height: barHeight(m.income), background: "#16a34a", borderRadius: 4 }}
                        />
                        <div
                          title={`รายจ่าย ${fmt(m.expense)}`}
                          style={{ width: 22, height: barHeight(m.expense), background: "#dc2626", borderRadius: 4 }}
                        />
                      </div>
                      <div className="section-hint" style={{ fontSize: 11, marginTop: 6 }}>
                        {m.month.replace(" 2569", "")}
                      </div>
                    </div>
                  ))}
                </div>
                <div className="section-hint" style={{ marginTop: 10 }}>
                  <span style={{ color: "#16a34a" }}>■</span> รายรับ &nbsp;
                  <span style={{ color: "#dc2626" }}>■</span> รายจ่าย &nbsp;· ความสูงคิดเป็นสัดส่วนของเดือนสูงสุด
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
