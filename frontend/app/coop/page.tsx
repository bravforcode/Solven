"use client";

import { useEffect, useState } from "react";
import Sidebar from "@/components/Sidebar";
import { fetchCoop, CoopAccount, CoopMember } from "@/lib/finance";

const fmt = (n: number) => `${n.toLocaleString("th-TH")} บาท`;

function statusBadge(status: string) {
  if (status === "ปกติ") return <span className="badge badge-approved">{status}</span>;
  if (status === "สมาชิกใหม่") return <span className="badge badge-pending">{status}</span>;
  return <span className="badge">{status}</span>;
}

const loanOutstanding = (m: CoopMember) =>
  m.loans.reduce((sum, loan) => sum + loan.remaining, 0);

export default function CoopPage() {
  const [coop, setCoop] = useState<CoopAccount | null>(null);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ name: "", savings: "" });
  const [extraMembers, setExtraMembers] = useState<CoopMember[]>([]);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    fetchCoop().then((data) => {
      setCoop(data);
      setLoading(false);
    });
  }, []);

  const members = [...(coop?.members ?? []), ...extraMembers];
  const totalSavings = (coop?.totalSavings ?? 0) + extraMembers.reduce((s, m) => s + m.savings, 0);

  const submitForm = () => {
    if (!form.name.trim()) return;
    const savings = Math.max(0, Number(form.savings) || 0);
    setExtraMembers((cur) => [
      ...cur,
      {
        id: `c-${100 + cur.length + 1}`,
        name: form.name.trim(),
        savings,
        shares: Math.floor(savings / 10),
        loans: [],
        status: "รออนุมัติ",
      },
    ]);
    setForm({ name: "", savings: "" });
    setSubmitted(true);
    window.setTimeout(() => setSubmitted(false), 4000);
  };

  return (
    <div className="shell">
      <Sidebar />
      <div className="main-col">
        <header className="topbar">
          <div>
            <h1 className="page-title">กองทุน/สหกรณ์</h1>
            <p className="page-sub">
              ทะเบียนสมาชิกกองทุนและสหกรณ์ตัวอย่าง (ข้อมูลสมมติ PDPA) — เงินออม หุ้น และเงินกู้
            </p>
          </div>
        </header>
        <main className="content view-in">
          {submitted && (
            <div className="panel panel-pad" style={{ marginBottom: 14 }}>
              ✓ ส่งใบสมัครสมาชิกตัวอย่างแล้ว (โหมดสาธิต — แสดงผลเฉพาะหน้านี้เท่านั้น)
            </div>
          )}
          {loading ? (
            <div className="panel panel-pad">กำลังโหลด...</div>
          ) : (
            <>
              <div className="panel panel-pad" style={{ marginBottom: 14 }}>
                <h2 className="section-title">ยอดรวมกองทุน</h2>
                <p className="section-hint" style={{ fontSize: 26, fontWeight: 600, marginTop: 6 }}>
                  {fmt(totalSavings)}
                </p>
                <p className="section-hint">สมาชิกทั้งหมด {members.length} คน</p>
              </div>

              <div className="panel panel-pad" style={{ marginBottom: 14 }}>
                <h2 className="section-title">สมาชิกกองทุน</h2>
                <table className="table" style={{ width: "100%", marginTop: 10 }}>
                  <thead>
                    <tr>
                      <th>ชื่อ</th>
                      <th>เงินออม</th>
                      <th>หุ้น (หน่วย)</th>
                      <th>ยอดหนี้คงเหลือ</th>
                      <th>สถานะ</th>
                    </tr>
                  </thead>
                  <tbody>
                    {members.map((m) => (
                      <tr key={m.id}>
                        <td>{m.name}</td>
                        <td>{fmt(m.savings)}</td>
                        <td>{m.shares.toLocaleString("th-TH")}</td>
                        <td>{loanOutstanding(m) > 0 ? fmt(loanOutstanding(m)) : <span className="section-hint">—</span>}</td>
                        <td>{statusBadge(m.status)}</td>
                      </tr>
                    ))}
                    {members.length === 0 && (
                      <tr>
                        <td colSpan={5}>
                          <div className="empty">
                            <div className="empty-title">ยังไม่มีสมาชิก</div>
                            <div className="empty-text">ลองสมัครสมาชิกผ่านฟอร์มด้านล่าง</div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
                <h3 className="section-title" style={{ fontSize: 14, marginTop: 18 }}>
                  สมัครสมาชิกใหม่ (โหมดสาธิต)
                </h3>
                <div className="field" style={{ maxWidth: 360 }}>
                  <label className="field-label">ชื่อ-นามสกุล</label>
                  <input
                    className="input"
                    placeholder="เช่น นางสาวมานี ดีเลิศ"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                  />
                </div>
                <div className="field" style={{ maxWidth: 360 }}>
                  <label className="field-label">เงินออมเริ่มต้น (บาท)</label>
                  <input
                    className="input"
                    type="number"
                    min={0}
                    placeholder="เช่น 500"
                    value={form.savings}
                    onChange={(e) => setForm({ ...form, savings: e.target.value })}
                  />
                </div>
                <button type="button" className="btn btn-primary btn-sm" onClick={submitForm}>
                  สมัครสมาชิก
                </button>
              </div>
            </>
          )}
          <p className="section-hint" style={{ marginTop: 14 }}>
            หุ้นคำนวณจากเงินออมเริ่มต้น 1 หุ้น = 10 บาท (ตัวอย่าง) · ข้อมูลทั้งหมดเป็นข้อมูลสมมติเท่านั้น
          </p>
        </main>
        <footer className="footer">
          Solven prototype — ข้อมูลทั้งหมดเป็นตัวอย่าง/อยู่ในเครื่องเท่านั้น ไม่มีข้อมูลนักเรียนจริง (PDPA)
        </footer>
      </div>
    </div>
  );
}
