import { ImageResponse } from "next/og";

export const alt = "Kaufklar – Gebrauchtwagen-Inserat prüfen, bevor du kaufst";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/** Vorschaubild für geteilte Links (WhatsApp, TikTok-Bio, Instagram). */
export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", background: "#131417", color: "#f4f4f0", display: "flex", flexDirection: "column", justifyContent: "space-between", padding: 72 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          <svg width={80} height={56} viewBox="0 0 40 28">
            <rect x="0.75" y="0.75" width="38.5" height="26.5" rx="2.5" fill="#fff" />
            <rect x="2.5" y="2.5" width="8" height="23" rx="1" fill="#0b3c9e" />
            <path d="m17 14.5 4.2 4.2L33 7.5" fill="none" stroke="#131417" strokeWidth="3.2" strokeLinecap="square" />
          </svg>
          <div style={{ fontSize: 44, fontWeight: 700 }}>Kaufklar</div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <div style={{ fontSize: 96, fontWeight: 800, lineHeight: 1 }}>Erst prüfen. Dann kaufen.</div>
          <div style={{ fontSize: 36, color: "#c9cbd1" }}>Inserat einfügen – Schwachstellen, Risiko und fairer Preis in einer Minute. Kostenlos.</div>
        </div>
      </div>
    ),
    size,
  );
}
