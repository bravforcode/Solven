"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_ITEMS: { href: string; label: string }[] = [
  { href: "/", label: "แดชบอร์ด" },
  { href: "/roster", label: "รายชื่อนักเรียน" },
  { href: "/exams", label: "คลังข้อสอบ" },
  { href: "/attendance", label: "เช็คชื่อ/มาเรียน" },
  { href: "/knowledge", label: "คลังความรู้" },
  { href: "/parent", label: "สื่อสารผู้ปกครอง" },
  { href: "/chat", label: "แชทกับผู้ช่วย" },
  { href: "/notifications", label: "ศูนย์แจ้งเตือน" },
];

export default function Sidebar() {
  const pathname = usePathname();
  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <span className="logo">S</span>
        <span className="brand-name">Solven</span>
      </div>
      <nav className="sidebar-nav" aria-label="ส่วนหลัก">
        {NAV_ITEMS.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={`sidebar-link${pathname === item.href ? " sidebar-link-active" : ""}`}
          >
            {item.label}
          </Link>
        ))}
      </nav>
      <div className="sidebar-foot">
        <Link href="/settings" className="sidebar-link">
          ตั้งค่าโรงเรียน
        </Link>
        <Link href="/about" className="sidebar-link">
          เกี่ยวกับโปรเจกต์
        </Link>
      </div>
    </aside>
  );
}