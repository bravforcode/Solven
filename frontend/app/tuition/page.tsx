"use client";

import { Fragment, useEffect, useState } from "react";
import Sidebar from "@/components/Sidebar";
import { fetchTuition, fetchPromptpay, TuitionInvoice } from "@/lib/finance";

const fmt = (n: number) => `${n.toLocaleString("th-TH")} บาท`;

function statusBadge(status: string) {
  if (status === "ชำระแล้ว") return <span className="badge badge-approved">{status}</span>;
  if (status === "รอชำระ") return <span className="badge badge-pending">{status}</span>;
  return <span className="badge">{status}</span>;
}

export default function TuitionPage() {
  const [invoices, setInvoices] = useState<TuitionInvoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [createdNotice, setCreatedNotice] = useState(false);
  const [qr, setQr] = useState<{ invoiceId: string; label: string; payload: string } | null>(
    null
  );
  const [qrBusy, setQrBusy] = useState(false);

  useEffect(() => {
    fetchTuition().then((rows) => {
      setInvoices(rows);
      setLoading(false);
    });
  }, []);

  const createInvoice = () => {
    setCreatedNotice(true);
    window.setTimeout(() => setCreatedNotice(false), 4000);
  };

  const createQr = async (inv: TuitionInvoice) => {
    if (inv.remaining <= 0) return;
    setQrBusy(true);
    try {
      const res = await fetchPromptpay(inv.remaining, inv.id);
      setQr({ invoiceId: inv.id, label: `${inv.studentName} — คงเหลือ ${fmt(inv.remaining)}`, payload: res.payload });
    } finally {
      setQrBusy(false);
    }
  };

  const toggle = (id: string) => setExpanded((cur) => (cur === id ? null : id));

  return (
    <div className="shell">
      <Sidebar />
      <div className="main-col">
        <header className="topbar">
          <div>
            <h1 className="page-title">ค่าเทอม</h1>
            <p className="page-sub">
              ใบแจ้งหนี้ค่าเทอมตัวอย่าง (ข้อมูลสมมติ PDPA) — ตรวจสอบยอดชำระ สร้างใบแจ้งหนี้ และ QR PromptPay
            </p>
          </div>
          <div className="topbar-actions">
            <button type="button" className="btn btn-primary btn-sm" onClick={createInvoice}>
              + ออกใบแจ้งหนี้
            </button>
          </div>
        </header>
        <main className="content view-in">
          {createdNotice && (
            <div className="panel panel-pad" style={{ marginBottom: 14 }}>
              ✓ สร้างใบแจ้งหนี้ตัวอย่างแล้ว (โหมดสาธิต — ไม่ได้บันทึกลงฐานข้อมูลจริง)
            </div>
          )}
          {loading ? (
            <div className="panel panel-pad">กำลังโหลด...</div>
          ) : (
            <div className="panel panel-pad">
              <h2 className="section-title">ใบแจ้งหนี้ภาคเรียนที่ 1/2569</h2>
              <table className="table" style={{ width: "100%", marginTop: 10 }}>
                <thead>
                  <tr>
                    <th>นักเรียน</th>
                    <th>ชั้น</th>
                    <th>ยอดรวม</th>
                    <th>ชำระแล้ว</th>
                    <th>คงเหลือ</th>
                    <th>กำหนดชำระ</th>
                    <th>สถานะ</th>
                    <th>QR PromptPay</th>
                  </tr>
                </thead>
                <tbody>
                  {invoices.map((inv) => (
                    <Fragment key={inv.id}>
                      <tr onClick={() => toggle(inv.id)} style={{ cursor: "pointer" }}>
                        <td>
                          {inv.studentName}
                          <span className="field-hint"> ({inv.id})</span>
                        </td>
                        <td>{inv.className}</td>
                        <td>{fmt(inv.total)}</td>
                        <td>{fmt(inv.paid)}</td>
                        <td>{fmt(inv.remaining)}</td>
                        <td>{inv.dueDate}</td>
                        <td>{statusBadge(inv.status)}</td>
                        <td>
                          {inv.remaining > 0 ? (
                            <button
                              type="button"
                              className="btn btn-secondary btn-sm"
                              disabled={qrBusy}
                              onClick={(e) => {
                                e.stopPropagation();
                                createQr(inv);
                              }}
                            >
                              สร้าง QR
                            </button>
                          ) : (
                            <span className="section-hint">—</span>
                          )}
                        </td>
                      </tr>
                      {expanded === inv.id && (
                        <tr key={`${inv.id}-detail`}>
                          <td colSpan={8} style={{ background: "rgba(0,0,0,0.02)" }}>
                            <div style={{ padding: "10px 16px" }}>
                              <h3 className="section-title" style={{ fontSize: 14 }}>
                                รายละเอียดรายการ ({inv.term})
                              </h3>
                              <table className="table" style={{ width: "100%", marginTop: 6 }}>
                                <thead>
                                  <tr>
                                    <th>รายการ</th>
                                    <th>จำนวนเงิน</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {inv.items.map((item, i) => (
                                    <tr key={i}>
                                      <td>{item.name}</td>
                                      <td>{fmt(item.amount)}</td>
                                    </tr>
                                  ))}
                                  <tr>
                                    <td>
                                      <strong>รวม</strong>
                                    </td>
                                    <td>
                                      <strong>{fmt(inv.total)}</strong>
                                    </td>
                                  </tr>
                                </tbody>
                              </table>
                              {qr && qr.invoiceId === inv.id && (
                                <div className="panel panel-pad" style={{ marginTop: 12 }}>
                                  <div className="field-label">Payload QR PromptPay — {qr.label}</div>
                                  <pre
                                    style={{
                                      fontFamily: "monospace",
                                      fontSize: 12,
                                      whiteSpace: "pre-wrap",
                                      wordBreak: "break-all",
                                      margin: 0,
                                    }}
                                  >
                                    {qr.payload}
                                  </pre>
                                  <p className="section-hint" style={{ marginTop: 8 }}>
                                    ใช้ payload นี้สร้าง QR Code ด้วยเครื่องมือใดก็ได้ (โหมดสาธิต — ยังไม่ส่งจริง)
                                  </p>
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <p className="section-hint" style={{ marginTop: 14 }}>
            คลิกแถวใบแจ้งหนี้เพื่อดูรายละเอียดรายการ · ปุ่ม QR สร้าง payload PromptPay สำหรับยอดคงเหลือ
          </p>
        </main>
        <footer className="footer">
          Solven prototype — ข้อมูลทั้งหมดเป็นตัวอย่าง/อยู่ในเครื่องเท่านั้น ไม่มีข้อมูลนักเรียนจริง (PDPA)
        </footer>
      </div>
    </div>
  );
}
