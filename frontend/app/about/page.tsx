import Link from "next/link";

export const metadata = {
  title: "เกี่ยวกับโปรเจกต์",
  description:
    "Solven — ผู้ช่วยครูแบบ multi-agent สำหรับ JUMP THAILAND Hackathon 2026: หลักฐานสถานะการพัฒนา (built vs target), สถาปัตยกรรม และแผนต่อยอด",
};

const EVIDENCE: { layer: string; now: string; target: string }[] = [
  {
    layer: "Web UI",
    now: "Next.js 14 (App Router, TS) + PWA + offline queue + review queue — รันได้จริง",
    target: "Offline-first hardening + นำร่องโรงเรียนจริง",
  },
  {
    layer: "Backend",
    now: "Python FastAPI + LangGraph coordinator + 3 sub-agents + SQLite audit log (agent_runs) — test suite 32 ข้อผ่าน",
    target: "Auth/RBAC (OIDC) + PostgreSQL + scale",
  },
  {
    layer: "Guardrail",
    now: "Rule-based: PII (เบอร์โทร/บัตรประชาชน/อีเมล), grounding ตัวเลข, human-in-the-loop reminder",
    target: "LLM-judge ตาม Appendix A.9",
  },
  {
    layer: "Offline-first",
    now: "IndexedDB queue + service worker background sync — งานที่สร้างตอนออฟไลน์ส่งอัตโนมัติเมื่อมีสัญญาณ",
    target: "iOS fallback + conflict UX ให้แน่นขึ้น",
  },
  {
    layer: "Audit",
    now: "บันทึกทุก agent call (model, prompt/output hash, latency, guardrail result)",
    target: "Dashboard สำหรับเขตพื้นที่/ผู้บริหาร",
  },
];

const ROADMAP = [
  "อัปโหลดรูปงานนักเรียน (ถ่ายจากกระดาษ) — OCR ระยะแรกเป็น mock flow",
  "ห้องเรียนของฉัน (Class/Roster) — จำรายชื่อนักเรียนใช้ซ้ำทุกสัปดาห์",
  "ส่งตรงผ่าน LINE OA (ครูยังอนุมัติก่อนส่งทุกครั้ง — HITL เดิม)",
  "Mobile UX audit + iOS offline fallback",
];

export default function AboutPage() {
  return (
    <main className="about-page">
      <section className="about-hero">
        <span className="about-logo">S</span>
        <h1>Solven — คืนเวลาให้ครูได้สอน</h1>
        <p className="about-sub">
          ผู้ช่วยครูแบบ multi-agent (ภาษาไทย) · JUMP THAILAND Hackathon 2026 ·
          โจทย์ Empowering Teachers
        </p>
      </section>

      <section className="panel about-section">
        <h2 className="section-title">ปัญหา</h2>
        <p>
          ผลประเมิน PISA 2022 พบว่าคะแนนคณิตศาสตร์ของนักเรียนไทยอายุ 15 ปีลดลงเหลือ{" "}
          <strong>394</strong> คะแนน (จาก 419 ในปี 2018) และความเหลื่อมล้ำระหว่างกลุ่มรายได้
          สูงขึ้น — ต้นตอเชิงโครงสร้างส่วนหนึ่งคือการขาดแคลนครูในโรงเรียนขนาดเล็ก
          (ครู 1 คนต้องสอนหลายวิชา/หลายชั้น และแบกงานธุรการ — ตรวจงาน รายงาน เอกสาร)
          ทำให้เวลาสอนจริงลดลง
        </p>
      </section>

      <section className="panel about-section">
        <h2 className="section-title">ทางออก</h2>
        <p>
          Solven = coordinator + 3 sub-agents ทำงานธุรการที่กินเวลาครูมากที่สุด{" "}
          <em>เป็นร่าง</em> แล้วให้ครูตรวจและอนุมัติทุกครั้ง (human-in-the-loop):
        </p>
        <ul className="about-list">
          <li>
            <strong>Grading &amp; Feedback</strong> — ตรวจงานตาม rubric + feedback
            รายบุคคล
          </li>
          <li>
            <strong>Lesson-Plan</strong> — ร่างแผนการสอนตรงหลักสูตร ปรับตามห้องจริง
          </li>
          <li>
            <strong>Reporting &amp; Communication</strong> — ร่างรายงาน/ข้อความถึง
            ผู้ปกครอง-ผู้บริหาร
          </li>
          <li>
            <strong>Guardrail agent</strong> — ตรวจ PII / ข้อมูลหลอน / ภาษา ก่อนถึงครู
            (เห็น badge ในคิวตรวจ)
          </li>
        </ul>
        <p className="about-note">
          ทำงานออฟไลน์ได้ (PWA + queue) — เหมาะกับครูโรงเรียนเล็กที่เน็ตไม่เสถียร
        </p>
      </section>

      <section className="panel about-section">
        <h2 className="section-title">หลักฐานสถานะการพัฒนา (built vs target)</h2>
        <table className="about-table">
          <thead>
            <tr>
              <th>ชั้น</th>
              <th>ทำแล้ว (ใน repo นี้)</th>
              <th>เป้าหมาย production</th>
            </tr>
          </thead>
          <tbody>
            {EVIDENCE.map((r) => (
              <tr key={r.layer}>
                <td>{r.layer}</td>
                <td>{r.now}</td>
                <td>{r.target}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="about-note">
          สถาปัตยกรรมเป้าหมายฉบับเต็ม: <code>docs/appendix-a-architecture.md</code> ใน repo
        </p>
      </section>

      <section className="panel about-section">
        <h2 className="section-title">ใช้เทคโนโลยี AIS ต่อยอด</h2>
        <ul className="about-list">
          <li>
            <strong>AIS 5G</strong> — ครูในพื้นที่ห่างไกลใช้งานผ่านมือถือ + ฐานกลยุทธ์
            offline-first/background sync
          </li>
          <li>
            <strong>AIS Cloud / EEC</strong> — core compute + data layer ในไทย
            (data sovereignty — ลดความเสี่ยง PDPA §28/29 และตรงโจทย์ใช้เทคโนโลยี AIS)
          </li>
          <li>
            <strong>NDLP / AIS AISpace</strong> — ช่องทางเข้าถึงครูจริง (K-12 ของรัฐ /
            เลเยอร์ครูในระบบนิเวศ AIS)
          </li>
          <li>
            <strong>NB-IoT / Magellan</strong> — ระยะขยายผล (อุปกรณ์ในโรงเรียนห่างไกล)
          </li>
        </ul>
      </section>

      <section className="panel about-section">
        <h2 className="section-title">แผนต่อยอด (หลัง Demo Day)</h2>
        <ul className="about-list">
          {ROADMAP.map((r) => (
            <li key={r}>{r}</li>
          ))}
        </ul>
      </section>

      <section className="panel about-section">
        <h2 className="section-title">ทีม &amp; ข้อมูลเพิ่มเติม</h2>
        <ul className="about-list">
          <li>GitHub:{" "}
            <a href="https://github.com/bravforcode/Solven" target="_blank" rel="noopener noreferrer">
              github.com/bravforcode/Solven
            </a>
          </li>
          <li>สไลด์นำเสนอ: docs/presentation/solven_pitch.pdf ใน repo</li>
          <li>เว็บนี้เป็น prototype — ข้อมูลทั้งหมดเป็นตัวอย่างสมมติ ไม่มีข้อมูลนักเรียนจริง (PDPA)</li>
        </ul>
        <p className="about-cta">
          <Link href="/" className="btn btn-primary btn-sm">
            ← กลับไปลองใช้แอป
          </Link>
        </p>
      </section>

      <footer className="about-footer">
        Solven · JUMP THAILAND 2026 · Empowering Teachers · v0.2.0
      </footer>
    </main>
  );
}
