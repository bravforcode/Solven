import "./globals.css";
import { ReactNode } from "react";
import { Inter, Noto_Sans_Thai } from "next/font/google";
import ServiceWorkerRegister from "@/components/ServiceWorkerRegister";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const notoThai = Noto_Sans_Thai({
  subsets: ["thai", "latin"],
  variable: "--font-noto-thai",
});

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://solven.example.com";

export const metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "Solven — คืนเวลาให้ครูได้สอน",
    template: "%s | Solven",
  },
  description:
    "ผู้ช่วยครูแบบ multi-agent ภาษาไทย: ตรวจงานตาม rubric ร่างแผนการสอน และร่างรายงาน/ข้อความถึงผู้ปกครอง — ครูตรวจและอนุมัติทุกครั้ง (human-in-the-loop) ลดภาระงานธุรการของครูในโรงเรียนขนาดเล็ก",
  keywords: [
    "ผู้ช่วยครู AI",
    "ตรวจงานอัตโนมัติ",
    "แผนการสอน",
    "รายงานผู้ปกครอง",
    "ครูไทย",
    "โรงเรียนขนาดเล็ก",
    "ลดภาระครู",
    "AI เพื่อการศึกษาไทย",
    "Empowering Teachers",
    "JUMP Thailand",
  ],
  authors: [{ name: "Team Solven" }],
  openGraph: {
    title: "Solven — คืนเวลาให้ครูได้สอน",
    description:
      "ผู้ช่วยครูแบบ multi-agent: ตรวจงาน ร่างแผนการสอน ร่างรายงาน — ครูอนุมัติทุกครั้ง",
    url: "/",
    siteName: "Solven",
    locale: "th_TH",
    type: "website",
    images: [{ url: "/og.png", width: 1200, height: 630, alt: "Solven — คืนเวลาให้ครูได้สอน" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Solven — คืนเวลาให้ครูได้สอน",
    description:
      "ผู้ช่วยครูแบบ multi-agent: ตรวจงาน ร่างแผนการสอน ร่างรายงาน — ครูอนุมัติทุกครั้ง",
    images: ["/og.png"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, "max-image-preview": "large" },
  },
  manifest: "/manifest.webmanifest",
  alternates: { canonical: "/" },
};

export const viewport = {
  themeColor: "#2563eb",
};

const structuredData = {
  "@context": "https://schema.org",
  "@type": "WebApplication",
  name: "Solven",
  alternateName: "Solven — ผู้ช่วยครู",
  url: SITE_URL,
  description:
    "ผู้ช่วยครูแบบ multi-agent สำหรับครูไทย: ตรวจงานตาม rubric ร่างแผนการสอน ร่างรายงาน/ข้อความถึงผู้ปกครอง โดยครูเป็นผู้ตรวจสอบและอนุมัติทุกผลลัพธ์",
  applicationCategory: "EducationalApplication",
  operatingSystem: "Any",
  inLanguage: "th-TH",
  offers: { "@type": "Offer", price: "0", priceCurrency: "THB" },
  creator: {
    "@type": "Organization",
    name: "Team Solven",
    url: SITE_URL,
  },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="th">
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
        />
      </head>
      <body className={`${inter.variable} ${notoThai.variable}`}>
        <ServiceWorkerRegister />
        {children}
      </body>
    </html>
  );
}
