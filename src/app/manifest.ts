import type { MetadataRoute } from "next";

/** Macht Tachoklar auf dem Handy installierbar (Startbildschirm, ohne Browserleiste). */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Tachoklar – KI-Kaufberater für Gebrauchtwagen",
    short_name: "Tachoklar",
    description: "Inserat einfügen, Risiken erkennen, fair verhandeln.",
    lang: "de",
    start_url: "/",
    display: "standalone",
    background_color: "#f4f4f0",
    theme_color: "#f4f4f0",
    icons: [
      { src: "/pwa-icon/192", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/pwa-icon/512", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/pwa-icon/512", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
