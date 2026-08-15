"use client";

import { useState } from "react";
import Sidebar from "@/components/Sidebar";

interface RagDoc {
  id: string;
  title: string;
  topic: string;
  snippet: string;
  score: number;
}

const API_URL =
  process.env.SOLVEN_BACKEND_URL ??
  process.env.NEXT_PUBLIC_SOLVEN_API_URL ??
  "http://localhost:8000";

const DEMO_MODE = process.env.NEXT_PUBLIC_SOLVEN_MODE === "demo";

const LOCAL_KB: RagDoc[] = [
  { id: "kb-001", title: "หลักสูตรแกนกลาง 2551 — คณิตศาสตร์ ป.5", topic: "หลักสูตร", snippet: "สาระที่ 1 จำนวนและพีชคณิต: การบวก ลบ คูณ หารเศษส่วน และสมการเชิงเส้นตัวแปรเดียว", score: 0.92 },
  { id: "kb-002", title: "คู่มือการเขียนแผนการสอน (สพฐ.)", topic: "แผนการสอน", snippet: "แผนการสอนควรประกอบด้วย จุดประสงค์การเรียนรู้ กิจกรรมการเรียนรู้ สื่อ และการวัดผลประเมินผล", score: 0.88 },
  { id: "kb-003", title: "แนวปฏิบัติการรายงานผลการเรียน ปพ.5", topic: "เอกสารราชการ", snippet: "ปพ.5 คือระเบียนแสดงผลการเรียน ต้องลงนามโดยครูประจำชั้นและผู้อำนวยการสถานศึกษา", score: 0.85 },
  { id: "kb-004", title: "คู่มือการสื่อสารกับผู้ปกครอง", topic: "ผู้ปกครอง", snippet: "การสื่อสารเชิงบวก: เริ่มจากจุดแข็งของนักเรียน แล้วค่อยเสนอจุดที่ควรพัฒนา พร้อมแนวทางร่วมกัน", score: 0.81 },
  { id: "kb-005", title: "แนวทางการจัดการชั้นเรียนเชิงบวก", topic: "ห้องเรียน", snippet: "ใช้การเสริมแรงเชิงบวก การตั้งกฎร่วมกัน และการให้ผลสะท้อนกลับอย่างสร้างสรรค์", score: 0.78 },
];

function localRag(query: string, limit: number): RagDoc[] {
  const q = query.toLowerCase();
  const scored = LOCAL_KB.map((doc) => {
    const hay = `${doc.title} ${doc.topic} ${doc.snippet}`.toLowerCase();
    let score = 0;
    for (const token of q.split(/\s+/)) {
      if (token && hay.includes(token)) score += 0.3;
    }
    return { ...doc, score: score > 0 ? score : 0.05 };
  }).sort((a, b) => b.score - a.score);
  return scored.slice(0, limit);
}

async function fetchRag(query: string, limit: number): Promise<RagDoc[]> {
  try {
    const params = new URLSearchParams({ q: query, limit: String(limit) });
    const res = await fetch(`${API_URL}/api/demo/rag?${params}`, {
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) throw new Error(`backend ${res.status}`);
    return (await res.json()) as RagDoc[];
  } catch {
    if (!DEMO_MODE) throw new Error("backend unreachable");
    return localRag(query, limit);
  }
}

const SUGGESTIONS = ["เศษส่วน ป.5", "แผนการสอน", "ปพ.5", "สื่อสารผู้ปกครอง"];

export default function KnowledgePage() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<RagDoc[] | null>(null);
  const [searching, setSearching] = useState(false);

  const onSearch = async (q?: string) => {
    const term = (q ?? query).trim();
    if (!term) return;
    setSearching(true);
    try {
      setResults(await fetchRag(term, 3));
    } catch {
      setResults([]);
    } finally {
      setSearching(false);
    }
  };

  return (
    <div className="shell">
      <Sidebar />
      <div className="main-col">
        <header className="topbar">
          <div>
            <h1 className="page-title">คลังความรู้</h1>
            <p className="page-sub">
              ค้นหาเอกสารอ้างอิง (RAG) — หลักสูตร คู่มือครู เอกสารราชการ ข้อมูลสมมติสำหรับสาธิต
            </p>
          </div>
        </header>
        <main className="content view-in">
          <div className="panel panel-pad" style={{ marginBottom: 14 }}>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              <input
                className="input"
                placeholder="ถาม เช่น 'เศษส่วน ป.5'"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && onSearch()}
                style={{ flex: 1, minWidth: 240 }}
              />
              <button type="button" className="btn btn-primary" onClick={() => onSearch()} disabled={searching}>
                {searching ? "กำลังค้นหา..." : "ค้นหา"}
              </button>
            </div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 10 }}>
              {SUGGESTIONS.map((s) => (
                <button key={s} type="button" className="btn btn-secondary btn-sm" onClick={() => { setQuery(s); onSearch(s); }}>
                  {s}
                </button>
              ))}
            </div>
          </div>

          {results && (
            <div className="panel panel-pad">
              <h2 className="section-title">ผลการค้นหา ({results.length})</h2>
              {results.length === 0 ? (
                <p className="section-hint">ไม่พบเอกสารที่เกี่ยวข้อง ลองเปลี่ยนคำค้น</p>
              ) : (
                results.map((doc) => (
                  <div key={doc.id} style={{ marginTop: 12, padding: 10, border: "1px solid var(--border, #e5e7eb)", borderRadius: 8 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
                      <strong>{doc.title}</strong>
                      <span className="badge badge-pending">{Math.round(doc.score * 100)}% ตรง</span>
                    </div>
                    <p className="section-hint" style={{ marginTop: 6 }}>{doc.snippet}</p>
                  </div>
                ))
              )}
            </div>
          )}
        </main>
        <footer className="footer">
          Solven prototype — ข้อมูลทั้งหมดเป็นตัวอย่าง/อยู่ในเครื่องเท่านั้น ไม่มีข้อมูลนักเรียนจริง (PDPA)
        </footer>
      </div>
    </div>
  );
}