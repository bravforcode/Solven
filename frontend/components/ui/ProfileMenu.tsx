"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { loadSchool } from "@/lib/school";

/** Thai-style initials: first 2 characters of the name (ignoring spaces). */
function initials(name: string): string {
  const parts = name.replace(/\s+/g, "").split("");
  return parts.slice(0, 2).join("") || "ท";
}

/**
 * Teacher avatar + profile menu. Reads the school profile (localStorage via
 * lib/school) — the same source the document header uses, so the menu always
 * reflects what the teacher saved in /settings.
 */
export default function ProfileMenu() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const school = loadSchool();

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={ref} className="profile-menu">
      <button
        type="button"
        className="avatar"
        title={`${school.teacherName} — คลิกเพื่อเปิดเมนู`}
        aria-expanded={open}
        aria-haspopup="menu"
        onClick={() => setOpen((v) => !v)}
      >
        {initials(school.teacherName)}
      </button>
      {open && (
        <div className="profile-dropdown" role="menu">
          <div className="profile-header">
            <span className="avatar avatar-lg" aria-hidden="true">
              {initials(school.teacherName)}
            </span>
            <div>
              <div className="profile-name">{school.teacherName}</div>
              <div className="profile-position">{school.position}</div>
              <div className="profile-school">{school.schoolName}</div>
            </div>
          </div>
          <div className="profile-divider" />
          <Link
            href="/settings"
            role="menuitem"
            className="profile-item"
            onClick={() => setOpen(false)}
          >
            โปรไฟล์ / ตั้งค่าโรงเรียน
          </Link>
          <Link
            href="/about"
            role="menuitem"
            className="profile-item"
            onClick={() => setOpen(false)}
          >
            เกี่ยวกับโปรเจกต์
          </Link>
        </div>
      )}
    </div>
  );
}
