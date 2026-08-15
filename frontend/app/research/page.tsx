"use client";

import { useEffect, useState } from "react";
import Sidebar from "@/components/Sidebar";
import { fetchResearch, ResearchProject, ResearchStatus } from "@/lib/teaching";

const STATUS_LABEL: Record<ResearchStatus, { text: string; cls: string }> = {
  done: { text: "เสร็จสิ้น", cls: "badge-approved" },
  running: { text: "กำลังดำเนินการ", cls: "badge" },
  draft: { text: "ร่าง", cls: "badge-pending" },
};

const OUTLINES = [
  "1) ที่มาและความสำคัญ 2) วัตถุประสงค์ 3) สมมติฐานการวิจัย 4) กลุ่มตัวอย่าง 5) เครื่องมือที่ใช้ 6) การเก็บรวบรวมข้อมูล 7) การวิเคราะห์ข้อมูล 8) แผนการดำเนินงาน 9) ประโยชน์ที่คาดว่าจะได้รับ",
  "1) ศึกษาสภาพปัญหา 2) ศึกษาเอกสารและงานวิจัยที่เกี่ยวข้อง 3) ออกแบบนวัตกรรม/สื่อ 4) ทดลองใช้กับกลุ่มตัวอย่าง 5) ประเมินผลก่อน-หลัง 6) สรุปและเผยแพร่",
];

function outlineFor(p: ResearchProject): string {
  return OUTLINES[p.gain >= 3 ? 0 : 1];
}

function gainPercent(p: ResearchProject): string {
  if (p.pretestAvg === 0) return "0%";
  return `${Math.round(((p.posttestAvg - p.pretestAvg) / p.pretestAvg) * 100)}%`;
}

export default function ResearchPage() {
  const [projects, setProjects] = useState<ResearchProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [openOutline, setOpenOutline] = useState<string | null>(null);

  useEffect(() => {
    fetchResearch().then((rows) => {
      setProjects(rows);
      setLoading(false);
    });
  }, []);

  return (
    <div className="shell">
      <Sidebar />
      <div className="main-col">
        <header className="topbar">
          <div>
            <h1 className="page-title">วิจัยในชั้นเรียน</h1>
            <p className="page-sub">
              โครงการวิจัยในชั้นเรียนตัวอย่าง (ข้อมูลสมมติ PDPA) — ติดตามผลก่อน/หลังเรียนและร่างโครงร่างด้วย AI
            </p>
          </div>
          <div className="topbar-actions">
            <span className="badge">{projects.length} โครงการ</span>
          </div>
        </header>
        <main className="content view-in">
          {loading ? (
            <div className="panel panel-pad">กำลังโหลด...</div>
          ) : (
            projects.map((p) => {
              const open = openOutline === p.id;
              return (
                <div className="panel panel-pad" key={p.id} style={{ marginBottom: 14 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                    <div>
                      <h2 className="section-title" style={{ marginBottom: 4 }}>
                        {p.title}
                      </h2>
                      <p className="section-hint">ครู{p.teacher}</p>
                    </div>
                    <span className={`badge ${STATUS_LABEL[p.status].cls}`}>{STATUS_LABEL[p.status].text}</span>
                  </div>
                  <div style={{ display: "flex", gap: 16, flexWrap: "wrap", marginTop: 10 }}>
                    <div>
                      <span className="section-hint">คะแนนก่อนเรียน</span>
                      <div>
                        <strong>{p.pretestAvg.toFixed(1)}</strong> / 10
                      </div>
                    </div>
                    <div>
                      <span className="section-hint">คะแนนหลังเรียน</span>
                      <div>
                        <strong>{p.posttestAvg.toFixed(1)}</strong> / 10
                      </div>
                    </div>
                    <div>
                      <span className="section-hint">พัฒนาการ (gain)</span>
                      <div>
                        <strong>{p.gain.toFixed(1)}</strong> คะแนน ({gainPercent(p)})
                      </div>
                    </div>
                  </div>
                  <div style={{ marginTop: 12 }}>
                    <button
                      type="button"
                      className="btn btn-sm btn-secondary"
                      onClick={() => setOpenOutline(open ? null : p.id)}
                    >
                      {open ? "ซ่อนโครงร่าง" : "AI ร่างโครงร่างวิจัย"}
                    </button>
                  </div>
                  {open && (
                    <div
                      style={{
                        marginTop: 10,
                        padding: "10px 12px",
                        borderRadius: 8,
                        background: "rgba(0,0,0,0.04)",
                      }}
                    >
                      <span className="section-hint">✨ โครงร่างโดย AI (สาธิต):</span>
                      <p style={{ marginTop: 6, whiteSpace: "pre-line" }}>{outlineFor(p)}</p>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </main>
        <footer className="footer">
          Solven prototype — ข้อมูลทั้งหมดเป็นตัวอย่าง/อยู่ในเครื่องเท่านั้น ไม่มีข้อมูลนักเรียนจริง (PDPA)
        </footer>
      </div>
    </div>
  );
}
