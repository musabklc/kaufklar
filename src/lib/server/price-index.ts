import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { parseYear } from "../analysis/knowledge";
import type { WebListing } from "../ai/provider";
import type { Comp, Vehicle } from "../types";

let client: SupabaseClient | null | undefined;
function db() {
  if (client === undefined)
    client = process.env.SUPABASE_URL && process.env.SUPABASE_SECRET_KEY ? createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SECRET_KEY) : null;
  return client;
}
export const priceIndexEnabled = () => db() !== null;

const norm = (s: string | null | undefined) => (s ?? "").toLowerCase().replace(/\s+/g, " ").trim();

/** Inserate ohne Link: Fingerabdruck als Schlüssel, damit dasselbe Auto nicht mehrfach in den Index zählt. */
const fingerprint = (v: Vehicle) => `fp:${norm(v.make)}|${norm(v.model)}|${parseYear(v.firstRegistration) ?? ""}|${v.mileageKm ?? ""}|${v.priceEur ?? ""}`;
const ownKey = (v: Vehicle) => v.listingUrl ?? fingerprint(v);

/** Entfernt Ausreißer (Tukey-Zäune), damit einzelne Fehleinträge den Index nicht verzerren. */
export function withoutOutliers(prices: number[]): number[] {
  if (prices.length < 4) return prices;
  const s = [...prices].sort((a, b) => a - b);
  const q = (p: number) => s[Math.floor((s.length - 1) * p)];
  const iqr = q(0.75) - q(0.25);
  return s.filter((x) => x >= q(0.25) - 1.5 * iqr && x <= q(0.75) + 1.5 * iqr);
}

type Row = { price_eur: number; source_url: string | null; year: number | null; mileage_km: number | null };

/** Vergleichbare Angebote: gleiche Marke/Modell/Kraftstoff, Baujahr ±2, km ±40 %, letzte 18 Monate. */
export async function findComparables(v: Vehicle): Promise<Comp[]> {
  const c = db();
  if (!c || !v.make || !v.model) return [];
  const year = parseYear(v.firstRegistration);
  let q = c
    .from("price_observations")
    .select("price_eur, source_url, year, mileage_km")
    .eq("make", norm(v.make))
    .eq("model", norm(v.model))
    .gte("created_at", new Date(Date.now() - 548 * 864e5).toISOString())
    .limit(60);
  if (v.fuel) q = q.eq("fuel", v.fuel);
  if (year) q = q.gte("year", year - 2).lte("year", year + 2);
  if (v.mileageKm) q = q.gte("mileage_km", Math.round(v.mileageKm * 0.6)).lte("mileage_km", Math.round(v.mileageKm * 1.4));
  const { data, error } = await q;
  if (error) {
    console.error("price index read failed", error.message);
    return [];
  }
  const rows = (data as Row[]).filter((r) => r.source_url !== ownKey(v)); // eigenes Inserat nie als Vergleich
  const keep = new Set(withoutOutliers(rows.map((r) => r.price_eur)));
  return rows
    .filter((r) => keep.has(r.price_eur))
    .map((r) => ({ price: r.price_eur, source: "index" as const, url: r.source_url?.startsWith("https://") ? r.source_url : undefined, label: [r.year, r.mileage_km && `${r.mileage_km.toLocaleString("de-DE")} km`].filter(Boolean).join(" · ") }));
}

export async function modelMedian(make: string, model: string, years: string): Promise<{ median: number | null; count: number }> {
  const c = db();
  if (!c) return { median: null, count: 0 };
  const ys = years.match(/(19|20)\d{2}/g)?.map(Number) ?? [];
  let q = c.from("price_observations").select("price_eur").eq("make", norm(make)).eq("model", norm(model)).limit(100);
  if (ys.length) q = q.gte("year", Math.min(...ys)).lte("year", Math.max(...ys));
  const { data } = await q;
  const p = withoutOutliers(((data ?? []) as { price_eur: number }[]).map((r) => r.price_eur)).sort((a, b) => a - b);
  return { median: p.length >= 3 ? p[Math.floor(p.length / 2)] : null, count: p.length };
}

/** Speichert eine Beobachtung anonym. Fehler werden nur geloggt – der Index darf die Analyse nie blockieren. */
export async function recordObservations(v: Vehicle, listingPrice: boolean, web: WebListing[]) {
  const c = db();
  if (!c || !v.make || !v.model) return;
  const base = { make: norm(v.make), model: norm(v.model), fuel: v.fuel, power_kw: v.powerKw };
  const rows = [
    ...(listingPrice && v.priceEur
      ? [{ ...base, variant: v.variant, year: parseYear(v.firstRegistration), mileage_km: v.mileageKm, price_eur: Math.round(v.priceEur), source: "listing", source_url: ownKey(v) }]
      : []),
    ...web.map((w) => ({ ...base, variant: w.title.slice(0, 200), year: w.year, mileage_km: w.mileageKm, price_eur: Math.round(w.priceEur), source: "web", source_url: w.url })),
  ].filter((r) => r.price_eur >= 500 && r.price_eur <= 500000);
  if (!rows.length) return;
  const { error } = await c.from("price_observations").upsert(rows, { onConflict: "source_url", ignoreDuplicates: true });
  if (error) console.error("price index write failed", error.message);
}
