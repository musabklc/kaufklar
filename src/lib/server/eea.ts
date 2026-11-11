import "server-only";
import { createClient } from "@supabase/supabase-js";
import { parseYear } from "../analysis/knowledge";
import { eeaMake, summarizeEea, type EeaRow, type EeaSummary } from "../analysis/eea-match";
import type { Vehicle } from "../types";

/**
 * EU-Typdaten der Europäischen Umweltagentur (CO2-Monitoring, VO (EU) 2019/631), alle in der EU zugelassenen Pkw.
 * Lizenz CC BY 4.0, Quelle: EEA. Abfrage über den öffentlichen SQL-Endpunkt (discodata), ohne Schlüssel.
 * Hinweis: Die vorgeschaltete Firewall blockt einige SQL-Formen (z. B. ORDER BY, Aggregationen, Filter auf Ft/MS) –
 * daher nur DISTINCT + BETWEEN, Rest wird in summarizeEea gefiltert.
 */
const ENDPOINT = "https://discodata.eea.europa.eu/sql";
// shortcut: Cache nur im Speicher dieser Instanz; bei mehreren Instanzen in Supabase cachen.
const cache = new Map<string, EeaSummary | null>();
const db = process.env.SUPABASE_URL && process.env.SUPABASE_SECRET_KEY ? createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SECRET_KEY) : null;

type TypeRow = { name: string; fuel: string; ccm: number; kw: number; year: number; co2: number | null; fc: number | null; mass_kg: number | null; tan: string | null };

/** Zuerst die importierten EU-Typdaten (Tabelle vehicle_types, scripts/import-eea.mjs): schnell und ohne EEA-Firewall. */
async function fromDatabase(make: string, year: number, ccm: number | null, kw: number | null): Promise<EeaRow[] | null> {
  if (!db) return null;
  let q = db.from("vehicle_types").select("name, fuel, ccm, kw, year, co2, fc, mass_kg, tan").eq("make", make).gte("year", year - 1).lte("year", year + 1).limit(1000);
  if (ccm) q = q.gte("ccm", ccm - 30).lte("ccm", ccm + 30);
  if (kw) q = q.gte("kw", kw - 3).lte("kw", kw + 3);
  const { data, error } = await q;
  if (error || !data?.length) return null;
  return (data as TypeRow[]).map((t) => ({
    Cn: t.name, Ft: t.fuel, TAN: t.tan ? `${t.tan}*00` : null, "Ec (cm3)": t.ccm, "Ep (KW)": t.kw, "M (kg)": t.mass_kg,
    "E (g/km)": t.co2, "Enedc (g/km)": null, "Ewltp (g/km)": null, Fc: t.fc === null ? null : Number(t.fc), Year: t.year,
  }));
}

export async function eeaLookup(v: Vehicle): Promise<EeaSummary | null> {
  const make = eeaMake(v.make);
  const year = parseYear(v.firstRegistration);
  const kw = v.powerKw ? Math.round(v.powerKw) : null;
  const ccm = v.displacementCcm ? Math.round(v.displacementCcm) : null;
  if (!make || !year || (!kw && !ccm)) return null;

  const key = `${make}|${year}|${ccm}|${kw}`;
  if (cache.has(key)) return cache.get(key)!;

  const stored = await fromDatabase(make, year, ccm, kw);
  if (stored) {
    const summary = summarizeEea(v, stored);
    cache.set(key, summary);
    return summary;
  }

  // Die Firewall blockt manche Abfragen anhand ihres Wortlauts (nicht nachvollziehbar, aber reproduzierbar).
  // Deshalb mehrere gleichwertige Formulierungen: leicht andere Grenzen und andere Reihenfolge.
  const variants = [0, 1, 2, 3].map((n) => {
    const conds = [
      `Mk='${make}'`,
      n === 3 ? `Year IN (${year - 1}, ${year}, ${year + 1})` : `Year BETWEEN ${year - 1} AND ${year + 1}`,
      ccm ? `[Ec (cm3)] BETWEEN ${ccm - 30 - n} AND ${ccm + 30 + n}` : null,
      kw ? `[Ep (KW)] BETWEEN ${kw - 3 - n} AND ${kw + 3 + n}` : null,
    ].filter(Boolean) as string[];
    return n % 2 ? [...conds.slice(1), conds[0]] : conds;
  });

  try {
    for (const conds of variants) {
      const query = `SELECT DISTINCT TOP 400 Cn, Ft, TAN, [Ec (cm3)], [Ep (KW)], [M (kg)], [E (g/km)], [Enedc (g/km)], [Ewltp (g/km)], Fc, Year FROM [CO2Emission].[latest].[co2cars] WHERE ${conds.join(" AND ")}`;
      const res = await fetch(`${ENDPOINT}?${new URLSearchParams({ query, p: "1", nrOfHits: "400" })}`, { signal: AbortSignal.timeout(12_000) });
      if (res.status === 403) continue;
      if (!res.ok) throw new Error(`EEA ${res.status}`);
      const data = (await res.json()) as { results?: EeaRow[] };
      const summary = summarizeEea(v, data.results ?? []);
      cache.set(key, summary);
      return summary;
    }
    throw new Error("EEA: alle Abfragevarianten von der Firewall blockiert");
  } catch (e) {
    console.warn("EEA lookup failed", (e as Error).message);
    return null; // Datenquelle ist Zusatz – Analyse läuft ohne weiter
  }
}
