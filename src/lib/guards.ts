/** Reine Prüf-Funktionen an Vertrauensgrenzen – ohne Server-Abhängigkeiten, damit sie getestet werden können. */

const ALLOWED = /^(www\.|suchen\.|m\.)?(mobile\.de|autoscout24\.de|kleinanzeigen\.de)$/;

export class LinkError extends Error {
  code: "INVALID" | "DISABLED" | "BLOCKED";
  constructor(message: string, code: LinkError["code"]) {
    super(message);
    this.code = code;
  }
}

export function validateListingUrl(raw: string): URL {
  let url: URL;
  try {
    url = new URL(raw.trim());
  } catch {
    throw new LinkError("Das ist kein gültiger Link.", "INVALID");
  }
  if (url.protocol !== "https:" || url.port || url.username || url.password || !ALLOWED.test(url.hostname))
    throw new LinkError("Unterstützt werden Links von mobile.de, AutoScout24 und Kleinanzeigen.", "INVALID");
  return url;
}

export type ImageType = "image/jpeg" | "image/png" | "image/webp";

/** Erkennt das Bildformat an den ersten Bytes (nicht am Dateinamen). */
export function sniff(b: Uint8Array): ImageType | null {
  const s = (from: number, to: number) => String.fromCharCode(...b.subarray(from, to));
  if (b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return "image/jpeg";
  if ([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a].every((x, i) => b[i] === x)) return "image/png";
  if (s(0, 4) === "RIFF" && s(8, 12) === "WEBP") return "image/webp";
  return null;
}

/** Nur https-Links aus fremden Quellen (KI, Datenbank) anzeigen – nie javascript: o. ä. */
export const safeHref = (u: string | null | undefined) => (u && /^https:\/\//i.test(u) ? u : undefined);
