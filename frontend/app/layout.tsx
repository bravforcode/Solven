import "./globals.css";
import { ReactNode } from "react";
import ServiceWorkerRegister from "@/components/ServiceWorkerRegister";

export const metadata = {
  title: "Solven — คืนเวลาให้ครู",
  description:
    "ผู้ช่วยครูแบบ multi-agent: ตรวจงาน ร่างแผนการสอน ร่างรายงาน — ครูอนุมัติทุกครั้ง",
  manifest: "/manifest.webmanifest",
};

export const viewport = {
  themeColor: "#2563eb",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="th">
      <body>
        <ServiceWorkerRegister />
        {children}
      </body>
    </html>
  );
}
