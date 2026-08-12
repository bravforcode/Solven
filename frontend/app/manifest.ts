import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Solven — คืนเวลาให้ครู",
    short_name: "Solven",
    description:
      "ผู้ช่วยครูแบบ multi-agent: ตรวจงาน ร่างแผนการสอน ร่างรายงาน — ครูอนุมัติทุกครั้ง",
    start_url: "/",
    display: "standalone",
    background_color: "#f5f8fc",
    theme_color: "#2563eb",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
      {
        src: "/icon-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml" },
    ],
  };
}
