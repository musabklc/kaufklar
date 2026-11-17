import { researchKey } from "@/lib/analysis/research";
import { SEED_TYPES } from "@/lib/analysis/seed-types";
import { serviceDb } from "@/lib/server/forum-admin";
import { runResearch } from "@/lib/server/research";
import { webSearchEnabled } from "@/lib/ai/provider";

export const maxDuration = 300;

/**
 * Recherche-Datenbank vorbefüllen: die nächsten noch nicht recherchierten Typen aus der Liste gängiger Gebrauchtwagen.
 * Nur mit CRON_SECRET. ?n= Anzahl je Aufruf (höchstens 6, parallel). Lässt Platz im KI-Tagesbudget für echte Nutzer.
 */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) return new Response("Unauthorized", { status: 401 });
  const db = serviceDb();
  if (!db || !webSearchEnabled()) return Response.json({ error: "Datenbank oder GEMINI_SEARCH_ENABLED fehlt" }, { status: 503 });

  const since = new Date();
  since.setUTCHours(0, 0, 0, 0);
  const { count: used } = await db.from("usage_events").select("id", { count: "exact", head: true }).eq("kind", "ai").gte("at", since.toISOString());
  const limit = Number(process.env.AI_DAILY_LIMIT) || 500;
  if ((used ?? 0) > limit - 150) return Response.json({ skipped: "KI-Tagesbudget wird für Nutzer gebraucht", used, limit });

  const { data: rows } = await db.from("model_research").select("key");
  const done = new Set((rows ?? []).map((r) => r.key));
  const open = SEED_TYPES.map((v) => ({ v, rk: researchKey(v)! })).filter(({ rk }) => rk && !done.has(rk.key));
  const n = Math.min(6, Math.max(1, Number(new URL(req.url).searchParams.get("n")) || 4));
  const batch = open.slice(0, n);
  await Promise.all(batch.map(({ v, rk }) => runResearch(rk.key, rk.label, v)));

  const { data: after } = await db.from("model_research").select("key, status").in("key", batch.map((b) => b.rk.key));
  return Response.json({ processed: after ?? [], remaining: open.length - batch.length, total: SEED_TYPES.length });
}
