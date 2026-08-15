"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_GROUPS: { label: string; items: { href: string; label: string }[] }[] = [
  {
    label: "หลัก",
    items: [
      { href: "/", label: "แดชบอร์ด" },
      { href: "/chat", label: "แชทกับผู้ช่วย" },
      { href: "/notifications", label: "ศูนย์แจ้งเตือน" },
    ],
  },
  {
    label: "การเรียนการสอน",
    items: [
      { href: "/roster", label: "รายชื่อนักเรียน" },
      { href: "/timetable", label: "ตารางสอน" },
      { href: "/homework", label: "การบ้าน" },
      { href: "/exams", label: "คลังข้อสอบ" },
      { href: "/exam-run", label: "ข้อสอบออนไลน์" },
      { href: "/curriculum", label: "แผนการเรียนรู้" },
      { href: "/attendance", label: "เช็คชื่อ/มาเรียน" },
      { href: "/knowledge", label: "คลังความรู้" },
      { href: "/media", label: "สื่อการเรียนรู้" },
      { href: "/plc", label: "PLC" },
      { href: "/research", label: "วิจัยในชั้นเรียน" },
    ],
  },
  {
    label: "นักเรียน/ผู้ปกครอง",
    items: [
      { href: "/portal", label: "พอร์ทัลผู้ปกครอง" },
      { href: "/parent", label: "สื่อสารผู้ปกครอง" },
      { href: "/registry", label: "ทะเบียนนักเรียน" },
      { href: "/scholarship", label: "ทุนการศึกษา" },
      { href: "/health", label: "สุขภาพนักเรียน" },
      { href: "/guidance", label: "ระบบแนะแนว" },
      { href: "/iep", label: "แผน IEP" },
    ],
  },
  {
    label: "บุคลากร/ธุรการ",
    items: [
      { href: "/staff", label: "บุคลากร" },
      { href: "/leave", label: "การลา" },
      { href: "/teacher-eval", label: "ประเมินครู ว.PA" },
      { href: "/budget", label: "งบประมาณ/พัสดุ" },
      { href: "/library", label: "ห้องสมุด" },
      { href: "/lunch", label: "อาหารกลางวัน" },
      { href: "/facilities", label: "อาคารสถานที่" },
    ],
  },
  {
    label: "ราชการ/สารบรรณ",
    items: [
      { href: "/doc-registry", label: "ทะเบียนหนังสือ" },
      { href: "/edocs", label: "สารบรรณอิเล็กทรอนิกส์" },
      { href: "/obec-reports", label: "รายงาน สพฐ./DMC" },
      { href: "/procurement", label: "จัดซื้อจัดจ้าง" },
    ],
  },
  {
    label: "AI ขั้นสูง",
    items: [
      { href: "/essay", label: "ตรวจเรียงความ" },
      { href: "/media-generator", label: "AI สร้างสื่อ" },
      { href: "/reading", label: "ประเมินการอ่าน" },
      { href: "/behavior", label: "วิเคราะห์พฤติกรรม" },
      { href: "/principal", label: "ผู้ช่วยผู้บริหาร" },
      { href: "/tutor", label: "AI ติวเตอร์" },
    ],
  },
  {
    label: "การเงิน",
    items: [
      { href: "/tuition", label: "ค่าเทอม/PromptPay" },
      { href: "/coop", label: "กองทุน/สหกรณ์" },
      { href: "/payroll", label: "เงินเดือนครู" },
      { href: "/finance-report", label: "รายงานการเงิน" },
    ],
  },
  {
    label: "ชุมชน/กิจกรรม",
    items: [
      { href: "/network", label: "เครือข่ายโรงเรียน" },
      { href: "/marketplace", label: "ตลาดสื่อ" },
      { href: "/news", label: "ประกาศ" },
      { href: "/activities", label: "กิจกรรม/ชมรม" },
      { href: "/sports", label: "กีฬาสี" },
      { href: "/bookings", label: "จองห้อง/อุปกรณ์" },
      { href: "/surveys", label: "แบบสำรวจ" },
      { href: "/badges", label: "เกมมิฟิเคชัน" },
    ],
  },
];

export default function Sidebar() {
  const pathname = usePathname();
  const flat = NAV_GROUPS.flatMap((g) => g.items);
  return (
    <>
      <aside className="sidebar">
        <div className="sidebar-brand">
          <span className="logo">S</span>
          <span className="brand-name">Solven</span>
        </div>
        <nav className="sidebar-nav" aria-label="ส่วนหลัก">
          {NAV_GROUPS.map((group) => (
            <div key={group.label} style={{ marginBottom: 10 }}>
              <div
                style={{
                  fontSize: "0.68rem",
                  color: "var(--muted, #6b7280)",
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                  padding: "6px 10px 2px",
                }}
              >
                {group.label}
              </div>
              {group.items.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`sidebar-link${pathname === item.href ? " sidebar-link-active" : ""}`}
                >
                  {item.label}
                </Link>
              ))}
            </div>
          ))}
        </nav>
        <div className="sidebar-foot">
          <Link href="/status" className="sidebar-link">
            สถานะระบบ
          </Link>
          <Link href="/settings" className="sidebar-link">
            ตั้งค่าโรงเรียน
          </Link>
          <Link href="/about" className="sidebar-link">
            เกี่ยวกับโปรเจกต์
          </Link>
        </div>
      </aside>
      {/* Mobile: horizontal scrollable nav (CSS shows this only ≤900px) */}
      <nav className="mobile-nav" aria-label="ส่วนหลัก (มือถือ)">
        {flat.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={`nav-item${pathname === item.href ? " nav-item-active" : ""}`}
            style={{ textDecoration: "none" }}
          >
            {item.label}
          </Link>
        ))}
      </nav>
    </>
  );
}