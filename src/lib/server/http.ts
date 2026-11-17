import "server-only";
import type { ImageInput } from "../ai/provider";
import { createHash } from "node:crypto";
import { sniff } from "../guards";
import { serviceDb } from "./forum-admin";

const MAX_IMAGES = 8;
const MAX_BYTES = 5 * 1024 * 1024;
const TYPES = ["image/jpeg", "image/png", "image/webp"] as const;

export const json = (body: unknown, status = 200) => Response.json(body, { status, headers: { "cache-control": "no-store" } });
export const fail = (error: string, status = 400) => json({ error }, status);

const hits = new Map<string, number[]>();
/** Notlösung ohne Datenbank (lokal): zählt nur in dieser Server-Instanz. */
function memoryLimited(key: string, limit: number, windowMs = 60_000) {
  const now = Date.now();
  // Alte Einträge löschen, damit IP-Adressen nicht länger als nötig im Speicher bleiben.
  if (hits.size > 500) for (const [k, ts] of hits) if (now - ts[ts.length - 1] > windowMs) hits.delete(k);
  const recent = (hits.get(key) ?? []).filter((t) => now - t < windowMs);
  recent.push(now);
  hits.set(key, recent);
  return recent.length > limit;
}

/** Anfragen-Limit je Funktion und Besucher, über alle Server-Instanzen (Supabase). Gespeichert wird nur ein gesalzener IP-Hash. */
export async function rateLimited(req: Request, perMinute = 10, perDay = perMinute * 4) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0].trim() || "local";
  const salt = process.env.REPORT_SALT || process.env.SUPABASE_SECRET_KEY || "tachoklar";
  // Limit je Funktion – eine Analyse darf das Melden nicht sperren
  const key = `${new URL(req.url).pathname}|${createHash("sha256").update(`${salt}|${ip}`).digest("hex").slice(0, 32)}`;
  const db = serviceDb();
  if (db) {
    const { data, error } = await db.rpc("rate_hit", { p_key: key, p_per_minute: perMinute, p_per_day: perDay });
    if (!error) return data === true;
    console.error("rate_hit failed", error.message); // Datenbank weg: lieber lokal zählen als alles sperren
  }
  return memoryLimited(key, perMinute);
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

