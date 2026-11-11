import { createClient } from "@supabase/supabase-js";
import { parseCarRecalls, parseWeeklyList, SAFETY_GATE_LIST } from "@/lib/analysis/safety-gate";

export const maxDuration = 60;

/**
 * Wöchentlicher Rückruf-Import (Vercel Cron, siehe vercel.json). Lädt die letzten Wochenberichte und ergänzt recalls_eu.
 * Nur mit CRON_SECRET aufrufbar – Vercel sendet ihn automatisch als Bearer-Token.
 */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) return new Response("Unauthorized", { status: 401 });
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SECRET_KEY) return new Response("Supabase nicht konfiguriert", { status: 503 });
  const db = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SECRET_KEY);

  const list = parseWeeklyList(await (await fetch(SAFETY_GATE_LIST, { signal: AbortSignal.timeout(20_000) })).text());
  let imported = 0;
  for (const report of list.slice(0, 3)) {
    const res = await fetch(report.url, { signal: AbortSignal.timeout(20_000) });
    if (!res.ok) continue;
    const rows = parseCarRecalls(await res.text());
    if (!rows.length) continue;
    const { error } = await db.from("recalls_eu").upsert(rows, { onConflict: "case_number" });
    if (error) return Response.json({ error: error.message }, { status: 500 });
    imported += rows.length;
  }
  return Response.json({ reports: Math.min(3, list.length), imported });
}
