"use client";

import { useEffect, useState } from "react";
import Sidebar from "@/components/Sidebar";
import { fetchQuestions, generateExam, GeneratedExam, Question } from "@/lib/exams";
import { downloadCsv } from "@/lib/csv";
import { useToast } from "@/components/ui/ToastProvider";

const SUBJECTS = ["คณิตศาสตร์", "วิทยาศาสตร์", "ภาษาไทย", "สังคมศึกษา"];
const GRADES = ["ป.4", "ป.5", "ม.1"];

export default function ExamsPage() {
  const { push } = useToast();
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [subject, setSubject] = useState("");
  const [grade, setGrade] = useState("");
  const [count, setCount] = useState(5);
  const [exam, setExam] = useState<GeneratedExam | null>(null);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    fetchQuestions().then((rows) => {
      setQuestions(rows);
      setLoading(false);
    });
  }, []);

  const onGenerate = async () => {
    if (!subject || !grade) {
      push("error", "เลือกวิชาและระดับชั้นก่อนสร้างข้อสอบ");
      return;
    }
    setGenerating(true);
    try {
      const result = await generateExam(subject, grade, count);
      setExam(result);
      push("success", `สร้างข้อสอบแล้ว ${result.questions.length} ข้อ`);
    } catch (err) {
      push("error", err instanceof Error ? err.message : String(err));
    } finally {
      setGenerating(false);
    }
  };

  const exportCsv = () => {
    const rows = questions.map((q) => ({
      วิชา: q.subject,
      ชั้น: q.grade,
      หัวข้อ: q.topic,
      โจทย์: q.text,
      "ตัวเลือก": (q.choices ?? []).join(" | "),
      เฉลย: q.answer,
      ระดับ: q.difficulty,
    }));
    downloadCsv("solven-question-bank", rows);
  };

  return (
    <div className="shell">
      <Sidebar />
      <div className="main-col">
        <header className="topbar">
          <div>
            <h1 className="page-title">คลังข้อสอบ</h1>
            <p className="page-sub">
              คลังคำถามตัวอย่าง + เครื่องสร้างข้อสอบอัตโนมัติ (ข้อมูลสมมติ) — ครูตรวจทานก่อนใช้งานทุกครั้ง
            </p>
          </div>
          <div className="topbar-actions">
            <button type="button" className="btn btn-secondary btn-sm" onClick={exportCsv}>
              ส่งออก CSV
            </button>
          </div>
        </header>
        <main className="content view-in">
          <div className="panel panel-pad" style={{ marginBottom: 14 }}>
            <h2 className="section-title">สร้างข้อสอบ</h2>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 10 }}>
              <select className="input" value={subject} onChange={(e) => setSubject(e.target.value)} style={{ maxWidth: 180 }}>
                <option value="">วิชา...</option>
                {SUBJECTS.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
              <select className="input" value={grade} onChange={(e) => setGrade(e.target.value)} style={{ maxWidth: 140 }}>
                <option value="">ชั้น...</option>
                {GRADES.map((g) => (
                  <option key={g} value={g}>{g}</option>
                ))}
              </select>
              <select className="input" value={count} onChange={(e) => setCount(Number(e.target.value))} style={{ maxWidth: 120 }}>
                {[3, 5, 8, 10].map((n) => (
                  <option key={n} value={n}>{n} ข้อ</option>
                ))}
              </select>
              <button type="button" className="btn btn-primary" onClick={onGenerate} disabled={generating}>
                {generating ? "กำลังสร้าง..." : "สร้างข้อสอบ"}
              </button>
            </div>
          </div>

          {exam && (
            <div className="panel panel-pad" style={{ marginBottom: 14 }}>
              <h2 className="section-title">{exam.title}</h2>
              <p className="section-hint">รหัสชุดข้อสอบ: {exam.examId} · สร้างโดย {exam.generatedBy}</p>
              {exam.questions.map((q, i) => (
                <div key={q.id} style={{ marginTop: 12, padding: 10, border: "1px solid var(--border, #e5e7eb)", borderRadius: 8 }}>
                  <p>
                    <strong>{i + 1}. {q.text}</strong>{" "}
                    <span className="badge badge-pending">{q.difficulty}</span>
                  </p>
                  {q.choices && (
                    <ul style={{ margin: "6px 0 0 18px", padding: 0 }}>
                      {q.choices.map((c) => (
                        <li key={c} style={{ listStyle: "none" }}>
                          {c} {c === q.answer ? "✓" : ""}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              ))}
            </div>
          )}

          <div className="panel panel-pad">
            <h2 className="section-title">คลังคำถาม ({questions.length} ข้อ)</h2>
            {loading ? (
              <p className="section-hint">กำลังโหลด...</p>
            ) : (
              <table className="table" style={{ width: "100%", marginTop: 10 }}>
                <thead>
                  <tr>
                    <th>วิชา</th>
                    <th>ชั้น</th>
                    <th>หัวข้อ</th>
                    <th>โจทย์</th>
                    <th>เฉลย</th>
                  </tr>
                </thead>
                <tbody>
                  {questions.map((q) => (
                    <tr key={q.id}>
                      <td>{q.subject}</td>
                      <td>{q.grade}</td>
                      <td>{q.topic}</td>
                      <td>{q.text}</td>
                      <td>{q.answer}</td>
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