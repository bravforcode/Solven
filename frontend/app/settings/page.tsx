"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import Sidebar from "@/components/Sidebar";
import { loadSchool, saveSchool, SCHOOL_DEFAULTS, SchoolInfo } from "@/lib/school";
// REVIEW PASS 2: layout.tsx already wraps every page in ToastProvider —
// consume useToast() directly, do NOT add a second provider
import { useToast } from "@/components/ui/ToastProvider";

const FIELDS: { key: keyof SchoolInfo; label: string; hint?: string }[] = [
  { key: "schoolName", label: "ชื่อโรงเรียน" },
  { key: "address", label: "ที่อยู่" },
  { key: "phone", label: "โทรศัพท์" },
  { key: "district", label: "สังกัด / เขตพื้นที่" },
  { key: "semester", label: "ภาคเรียนที่", hint: "เช่น 1" },
  { key: "year", label: "ปีการศึกษา", hint: "เช่น 2569" },
  { key: "teacherName", label: "ชื่อครูผู้สอน" },
  { key: "position", label: "ตำแหน่ง" },
  { key: "directorName", label: "ชื่อผู้อำนวยการ (เกียรติบัตร/หนังสือ)" },
  { key: "refNo", label: "เลขที่หนังสือราชการ", hint: "เช่น ____/2569" },
];

function SettingsForm() {
  const { push } = useToast();
  // Hydration-safe: render defaults first, sync stored profile after mount
  // (reading localStorage during render breaks SSR/client equality).
  const [info, setInfo] = useState<SchoolInfo>(SCHOOL_DEFAULTS);

  useEffect(() => {
    setInfo(loadSchool());
  }, []);

  const set = (key: keyof SchoolInfo, value: string) =>
    setInfo((prev) => ({ ...prev, [key]: value }));

  const onSave = (e: React.FormEvent) => {
    e.preventDefault();
    saveSchool(info);
    push("success", "บันทึกข้อมูลโรงเรียนแล้ว");
  };

  return (
    <div className="shell">
      <Sidebar />
      <div className="main-col">
        <header className="topbar">
          <div>
            <h1 className="page-title">ตั้งค่าโรงเรียน</h1>
            <p className="page-sub">
              ข้อมูลนี้ใช้เป็นหัวเอกสารราชการทุกแบบ (ใบงาน / บันทึกหลังสอน / หนังสือราชการ / เกียรติบัตร)
            </p>
          </div>
        </header>
        <main className="content view-in">
          <form className="panel panel-pad" onSubmit={onSave} style={{ maxWidth: 640 }}>
            <div className="settings-grid" style={{ display: "grid", gap: 14 }}>
              {FIELDS.map((f) => (
                <div className="field" key={f.key}>
                  <label className="field-label" htmlFor={`settings-${f.key}`}>
                    {f.label}
                  </label>
                  <input
                    id={`settings-${f.key}`}
                    className="input"
                    value={info[f.key]}
                    onChange={(e) => set(f.key, e.target.value)}
                  />
                  {f.hint && <span className="field-hint">{f.hint}</span>}
                </div>
              ))}
            </div>
            <div style={{ display: "flex", gap: 10, marginTop: 18 }}>
              <button type="submit" className="btn btn-primary">
                บันทึกข้อมูล
              </button>
              <Link href="/" className="btn btn-secondary">
                ยกเลิก
              </Link>
            </div>
          </form>
        </main>
        <footer className="footer">
          Solven prototype — ข้อมูลทั้งหมดเป็นตัวอย่าง/อยู่ในเครื่องเท่านั้น ไม่มีข้อมูลนักเรียนจริง (PDPA)
        </footer>
      </div>
    </div>
  );
}

export default function SettingsPage() {
  return <SettingsForm />;
}
