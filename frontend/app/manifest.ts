import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Solven — คืนเวลาให้ครู",
    short_name: "Solven",
    description:
      "ผู้ช่วยครูแบบ multi-agent: ตรวจงาน ร่างแผนการสอน ร่างรายงาน — ครูอนุมัติทุกครั้ง",
    start_url: "/",
    display: "standalone",
    background_color: "#f4f6f9",
    theme_color: "#0f6f5c",
    icons: [
      {
        src: "/icon.svg",
        sizes: "any",
        type: "image/svg+xml",
      },
    ],
  };
}
