import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "جسر | JISR - خدمات الصيانة المنزلية",
    short_name: "جسر",
    description: "المنصة الأولى لحجز ومتابعة خدمات الصيانة المنزلية الموثوقة في الأردن",
    start_url: "/",
    display: "standalone",
    background_color: "#faf8f5",
    theme_color: "#0284c7",
    orientation: "portrait",
    icons: [
      {
        src: "/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any maskable",
      },
      {
        src: "/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any maskable",
      },
    ],
  };
}