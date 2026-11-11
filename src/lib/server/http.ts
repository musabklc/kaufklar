import "server-only";
import type { ImageInput } from "../ai/provider";

const MAX_IMAGES = 8;
const MAX_BYTES = 5 * 1024 * 1024;
const TYPES = ["image/jpeg", "image/png", "image/webp"] as const;

export const json = (body: unknown, status = 200) => Response.json(body, { status, headers: { "cache-control": "no-store" } });
export const fail = (error: string, status = 400) => json({ error }, status);

// shortcut: In-Memory-Ratelimit pro Serverinstanz; bei mehreren Instanzen/Serverless auf Redis/Upstash umstellen.
const hits = new Map<string, number[]>();
export function rateLimited(req: Request, limit = 10, windowMs = 60_000) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0].trim() || "local";
  const key = `${new URL(req.url).pathname}|${ip}`; // Limit je Funktion – eine Analyse darf das Melden nicht sperren
  const now = Date.now();
  const recent = (hits.get(key) ?? []).filter((t) => now - t < windowMs);
  recent.push(now);
  hits.set(key, recent);
  return recent.length > limit;
}

/** Prüft Uploads anhand von Größe, MIME-Typ und Magic Bytes. Bilder werden nur im Speicher verarbeitet, nie gespeichert. */
export async function readImages(files: FormDataEntryValue[]): Promise<ImageInput[]> {
  const list = files.filter((f): f is File => f instanceof File && f.size > 0);
  if (list.length > MAX_IMAGES) throw new Error(`Maximal ${MAX_IMAGES} Bilder.`);
  return Promise.all(
    list.map(async (f) => {
      if (f.size > MAX_BYTES) throw new Error(`„${f.name}“ ist größer als 5 MB.`);
      const buf = Buffer.from(await f.arrayBuffer());
      const type = sniff(buf);
      if (!type || !TYPES.includes(type)) throw new Error(`„${f.name}“ ist kein JPG-, PNG- oder WebP-Bild.`);
      return { mediaType: type, data: buf.toString("base64") };
    }),
  );
}

function sniff(b: Buffer): ImageInput["mediaType"] | null {
  if (b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return "image/jpeg";
  if (b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return "image/png";
  if (b.subarray(0, 4).toString() === "RIFF" && b.subarray(8, 12).toString() === "WEBP") return "image/webp";
  return null;
}
