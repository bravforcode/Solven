"use client";

import { useEffect, useState } from "react";
import Sidebar from "@/components/Sidebar";
import { fetchNotifications, markNotificationRead, Notification } from "@/lib/notifications";

const TYPE_LABEL: Record<Notification["type"], string> = {
  draft_ready: "ร่างพร้อมตรวจ",
  guardrail: "การ์ดกันผิดพลาด",
  quota: "โควตา",
  billing: "การเงิน",
  system: "ระบบ",
};

export default function NotificationsPage() {
  const [items, setItems] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchNotifications().then((rows) => {
      setItems(rows);
      setLoading(false);
    });
  }, []);

  const markRead = (id: string) => {
    markNotificationRead(id);
    setItems((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
  };

  const unread = items.filter((n) => !n.read).length;

  return (
    <div className="shell">
      <Sidebar />
      <div className="main-col">
        <header className="topbar">
          <div>
            <h1 className="page-title">ศูนย์แจ้งเตือน</h1>
            <p className="page-sub">
              เหตุการณ์สำคัญจากระบบ: ร่างพร้อมตรวจ, การ์ดกันความผิดพลาด, โควตา และการเงิน
              {unread > 0 && <span className="badge badge-pending" style={{ marginLeft: 8 }}>{unread} ยังไม่อ่าน</span>}
            </p>
          </div>
        </header>
        <main className="content view-in">
          {loading ? (
            <div className="panel panel-pad">กำลังโหลด...</div>
          ) : (
            <div className="panel panel-pad">
              {items.map((n) => (
                <button
                  type="button"
                  key={n.id}
                  onClick={() => markRead(n.id)}
                  style={{
                    display: "block",
                    width: "100%",
                    textAlign: "left",
                    padding: "12px 0",
                    border: "none",
                    borderBottom: "1px solid var(--border, #e5e7eb)",
                    background: "transparent",
                    cursor: "pointer",
                    opacity: n.read ? 0.65 : 1,
                  }}
                >
                  <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    <span className={`badge badge-${n.type === "guardrail" ? "guardrail-pii" : n.type === "quota" ? "guardrail-warn" : "pending"}`}>
                      {TYPE_LABEL[n.type]}
                    </span>
                    {!n.read && <span className="badge badge-pending">ใหม่</span>}
                    <span className="field-hint">{new Date(n.createdAt).toLocaleString("th-TH")}</span>
                  </div>
                  <strong style={{ display: "block", marginTop: 6 }}>{n.title}</strong>
                  <span className="section-hint">{n.body}</span>
                </button>
              ))}
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