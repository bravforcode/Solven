"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { loadSchool, SCHOOL_DEFAULTS, SchoolInfo } from "@/lib/school";

/** Thai-style initials: first 2 characters of the name (ignoring spaces). */
function initials(name: string): string {
  const parts = name.replace(/\s+/g, "").split("");
  return parts.slice(0, 2).join("") || "ท";
}

/**
 * Teacher avatar + profile menu. Reads the school profile (localStorage via
 * lib/school) — the same source the document header uses, so the menu always
 * reflects what the teacher saved in /settings.
 *
 * Hydration-safe: localStorage is never read during render (SSR output would
 * differ from the client's stored profile and break React hydration). We
 * render SCHOOL_DEFAULTS first and sync the stored profile after mount.
 */
export default function ProfileMenu() {
  const [open, setOpen] = useState(false);
  const [school, setSchool] = useState<SchoolInfo>(SCHOOL_DEFAULTS);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setSchool(loadSchool());
  }, []);

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
