"use client";

import { useEffect, useState } from "react";
import Sidebar from "@/components/Sidebar";
import { fetchExamRunner, ExamRunner } from "@/lib/teaching";

export default function ExamRunPage() {
  const [exam, setExam] = useState<ExamRunner | null>(null);
  const [loading, setLoading] = useState(true);
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    fetchExamRunner().then((data) => {
      setExam(data);
      setLoading(false);
    });
  }, []);

  const pick = (no: number, choiceIdx: number) => {
    if (submitted) return;
    setAnswers((prev) => ({ ...prev, [no]: choiceIdx }));
  };

  const score = exam
    ? exam.answerKey.filter((k) => answers[k.no] === k.answer).length
    : 0;

  return (
    <div className="shell">
      <Sidebar />
      <div className="main-col">
        <header className="topbar">
          <div>
            <h1 className="page-title">ข้อสอบออนไลน์</h1>
            <p className="page-sub">
              ระบบทำข้อสอบออนไลน์ตัวอย่าง (ข้อมูลสมมติ PDPA) — ตอบ 3 ข้อแล้วส่งตรวจทันที
            </p>
          </div>
          <div className="topbar-actions">
            {exam && (
              <span className="badge">{exam.totalQuestions} ข้อ</span>
            )}
          </div>
        </header>
        <main className="content view-in">
          {loading || !exam ? (
            <div className="panel panel-pad">กำลังโหลด...</div>
          ) : (
            <>
              {submitted && (
                <div className="panel panel-pad" style={{ marginBottom: 14 }}>
                  <h2 className="section-title">
                    คะแนนที่ได้: {score}/{exam.totalQuestions}
                  </h2>
                  <p className="section-hint">
                    {score === exam.totalQuestions
                      ? "ยอดเยี่ยม! ทำได้ครบทุกข้อ 🎉"
                      : score >= exam.totalQuestions / 2
                        ? "ผ่านเกณฑ์ — ลองทบทวนข้อที่ผิดอีกครั้ง"
                        : "ยังไม่ผ่านเกณฑ์ — แนะนำให้ทบทวนบทเรียนก่อนสอบจริง"}
                  </p>
                </div>
              )}
              {exam.questions.map((q) => {
                const chosen = answers[q.no];
                const correct = exam.answerKey.find((k) => k.no === q.no)?.answer;
                const isRight = chosen === correct;
                return (
                  <div className="panel panel-pad" key={q.no} style={{ marginBottom: 12 }}>
                    <h2 className="section-title" style={{ marginBottom: 8 }}>
                      ข้อ {q.no}. {q.question}
                    </h2>
                    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                      {q.choices.map((choice, idx) => {
                        const selected = chosen === idx;
                        const showCorrect = submitted && correct === idx;
                        const showWrong = submitted && selected && !isRight;
                        return (
                          <button
                            type="button"
                            key={`${q.no}-${idx}`}
                            className={`btn btn-sm ${
                              showCorrect ? "btn-primary" : showWrong ? "btn-secondary" : selected ? "btn-primary" : "btn-secondary"
                            }`}
                            style={{ justifyContent: "flex-start", textAlign: "left" }}
                            onClick={() => pick(q.no, idx)}
                          >
                            {String.fromCharCode(65 + idx)}. {choice}
                            {showCorrect && " ✓"}
                            {showWrong && " ✗"}
                          </button>
                        );
                      })}
                    </div>
                    {submitted && (
                      <p className="section-hint" style={{ marginTop: 8 }}>
                        {isRight ? "✓ ตอบถูกต้อง" : `✗ ตอบผิด — คำตอบที่ถูกคือข้อ ${String.fromCharCode(65 + (correct ?? 0))}`}
                      </p>
                    )}
                  </div>
                );
              })}
              {!submitted ? (
                <button
                  type="button"
                  className="btn btn-primary"
                  disabled={Object.keys(answers).length < exam.questions.length}
                  onClick={() => setSubmitted(true)}
                >
                  ส่งคำตอบ
                </button>
              ) : (
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => {
                    setAnswers({});
                    setSubmitted(false);
                  }}
                >
                  ทำใหม่
                </button>
              )}
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
