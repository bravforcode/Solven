"use client";

import { useEffect, useState } from "react";
import Sidebar from "@/components/Sidebar";
import { fetchSurveys, Survey, SurveysData } from "@/lib/community";

export default function SurveysPage() {
  const [data, setData] = useState<SurveysData>({ surveys: [] });
  const [loading, setLoading] = useState(true);
  const [submitted, setSubmitted] = useState<Record<string, number>>({});

  useEffect(() => {
    fetchSurveys().then((d) => {
      setData(d);
      setLoading(false);
    });
  }, []);

  const answer = (sv: Survey, score: number) => {
    setSubmitted((prev) => ({ ...prev, [sv.id]: score }));
  };

  const shownSurvey = (sv: Survey): Survey => {
    const mine = submitted[sv.id];
    if (mine == null) return sv;
    const newCount = sv.responsesCount + 1;
    const newAvg = Math.round(((sv.avgScore * sv.responsesCount + mine) / newCount) * 10) / 10;
    return { ...sv, responsesCount: newCount, avgScore: newAvg };
  };

  return (
    <div className="shell">
      <Sidebar />
      <div className="main-col">
        <header className="topbar">
          <div>
            <h1 className="page-title">แบบสำรวจ</h1>
            <p className="page-sub">
              แบบสำรวจความคิดเห็นครู ผู้ปกครอง และนักเรียน (ข้อมูลตัวอย่าง PDPA)
            </p>
          </div>
          <div className="topbar-actions">
            <span className="badge">{data.surveys.length} แบบสำรวจ</span>
          </div>
        </header>
        <main className="content view-in">
          {loading ? (
            <div className="panel panel-pad">กำลังโหลด...</div>
          ) : (
            <>
              {data.surveys.map((sv) => {
                const shown = shownSurvey(sv);
                const done = submitted[sv.id] != null;
                return (
                  <div className="panel panel-pad" key={sv.id} style={{ marginBottom: 14 }}>
                    <h2 className="section-title" style={{ fontSize: 15 }}>
                      {sv.title}
                    </h2>
                    <p className="section-hint">
                      {shown.questions.length} คำถาม · {shown.responsesCount} คำตอบ · คะแนนเฉลี่ย{" "}
                      {shown.avgScore.toFixed(1)}/5
                    </p>
                    {done ? (
                      <div className="panel panel-pad" style={{ marginTop: 10 }}>
                        <p className="field-label">🙏 ขอบคุณที่ตอบแบบสำรวจ!</p>
                        <p className="section-hint">
                          คะแนนเฉลี่ยอัปเดตเป็น {shown.avgScore.toFixed(1)}/5 จากการตอบทั้งหมด{" "}
                          {shown.responsesCount} ครั้ง (บันทึกในเครื่องเท่านั้น)
                        </p>
                      </div>
                    ) : (
                      <>
                        <p className="field-label" style={{ marginTop: 10 }}>
                          {sv.questions[0]?.q ?? "คำถามแรก"}
                        </p>
                        <div style={{ marginTop: 8 }}>
                          {[1, 2, 3, 4, 5].map((score) => (
                            <button
                              type="button"
                              key={score}
                              className="btn btn-secondary btn-sm"
                              style={{ marginRight: 6 }}
                              onClick={() => answer(sv, score)}
                            >
                              {score}
                            </button>
                          ))}
                          <span className="section-hint" style={{ marginLeft: 6 }}>
                            (1 = น้อยที่สุด, 5 = มากที่สุด)
                          </span>
                        </div>
                      </>
                    )}
                  </div>
                );
              })}
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
