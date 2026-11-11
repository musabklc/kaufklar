import { ImageResponse } from "next/og";

/** App-Icon: Kennzeichen-Ausschnitt (EU-Blau + Haken) auf Tinte – mit Rand, damit es auch als "maskable" Icon passt. */
export function brandIcon(size: number) {
  const plate = Math.round(size * 0.62);
  return new ImageResponse(
    (
      <div style={{ width: size, height: size, background: "#131417", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <svg width={plate} height={Math.round(plate * 0.7)} viewBox="0 0 40 28">
          <rect x="0.75" y="0.75" width="38.5" height="26.5" rx="2.5" fill="#fff" />
          <rect x="2.5" y="2.5" width="8" height="23" rx="1" fill="#0b3c9e" />
          <path d="m17 14.5 4.2 4.2L33 7.5" fill="none" stroke="#131417" strokeWidth="3.2" strokeLinecap="square" />
        </svg>
      </div>
    ),
    { width: size, height: size },
  );
}
