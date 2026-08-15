"use client";

import { useEffect, useState } from "react";
import Sidebar from "@/components/Sidebar";
import { fetchEdocWorkflow, webcryptoSign, EdocDoc, EdocWorkflow } from "@/lib/govdocs";

export default function EdocsPage() {
  const [data, setData] = useState<EdocWorkflow>({ docs: [], workflowSteps: [], generatedBy: "" });
  const [loading, setLoading] = useState(true);
  const [sigMap, setSigMap] = useState<Record<string, string>>({});

  useEffect(() => {
    fetchEdocWorkflow().then((rows) => {
      setData(rows);
      setLoading(false);
    });
  }, []);

  // Real browser WebCrypto SHA-256 signatures (พ.ร.บ. ลายเซ็นอิเล็กทรอนิกส์) for approved docs
  useEffect(() => {
    if (!data.docs.length) return;
    let cancelled = false;
    (async () => {
      const next: Record<string, string> = {};
      for (const doc of data.docs) {
        if (doc.status !== "อนุมัติแล้ว") continue;
        next[doc.id] = await webcryptoSign(`${doc.id}::${doc.title}::${doc.creator}`);
        if (cancelled) return;
      }
      setSigMap(next);
    })();
    return () => { cancelled = true; };
  }, [data.docs]);

  const statusBadge = (s: string) =>
    s === "อนุมัติแล้ว" ? <span className="badge badge-approved">{s}</span> : s === "ส่งแล้ว" ? <span className="badge badge-pending">{s}</span> : <span className="badge badge-quarantined">{s}</span>;

  return (
    <div className="shell">
      <Sidebar />
      <div className="main-col">
        <header className="topbar">
          <div>
            <h1 className="page-title">สารบรรณอิเล็กทรอนิกส์</h1>
            <p className="page-sub">
              ขั้นตอนการทำงานเอกสาร: ร่าง → เสนอ → อนุมัติ → ส่ง + ลายเซ็นอิเล็กทรอนิกส์จริง (WebCrypto SHA-256)
            </p>
          </div>
        </header>
        <main className="content view-in">
          {loading ? (
            <div className="panel panel-pad">กำลังโหลด...</div>
          ) : (
            <>
              <div className="panel panel-pad" style={{ marginBottom: 14 }}>
                <h2 className="section-title">ขั้นตอนการทำงาน</h2>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 10 }}>
                  {data.workflowSteps.map((s, i) => (
                    <span key={s} className="badge badge-pending">
                      {i + 1}. {s} {i < data.workflowSteps.length - 1 ? "→" : ""}
                    </span>
                  ))}
                </div>
              </div>
              <div className="panel panel-pad">
                {data.docs.map((doc) => (
                  <div key={doc.id} style={{ padding: "12px 0", borderBottom: "1px solid var(--border, #e5e7eb)" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "center" }}>
                      <div>
                        <strong>{doc.title}</strong>
                        <span className="field-hint" style={{ marginLeft: 8 }}>
                          {doc.kind} · โดย {doc.creator}
                        </span>
                      </div>
                      {statusBadge(doc.status)}
                    </div>
                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 8 }}>
                      {doc.steps.map((st) => (
                        <span key={st.name} className={`badge ${st.done ? "badge-approved" : "badge-pending"}`}>
                          {st.done ? "✓" : "○"} {st.name}{st.done ? ` · ${st.by} (${st.date})` : ""}
                        </span>
                      ))}
                    </div>
                    {sigMap[doc.id] && (
                      <p className="field-hint" style={{ marginTop: 8, fontFamily: "monospace", fontSize: "0.72rem" }}>
                        🔏 ลายเซ็นอิเล็กทรอนิกส์ (SHA-256): {sigMap[doc.id]}
                      </p>
                    )}
                  </div>
                ))}
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