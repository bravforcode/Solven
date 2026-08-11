import "./globals.css";
import { ReactNode } from "react";

export const metadata = {
  title: "Solven — Prototype",
  description: "Multi-agent teacher assistant prototype",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="th">
      <body>{children}</body>
    </html>
  );
}
