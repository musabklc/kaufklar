import type { Level, Vehicle } from "../types.ts";

export const COMPONENTS = ["Motor", "Getriebe", "Kupplung", "Elektrik", "Fahrwerk", "Bremsen", "Karosserie/Rost", "Abgasanlage", "Klima/Heizung", "Innenraum", "Sonstiges"] as const;

/** Ein Problem wird erst sichtbar, wenn so viele verschiedene Personen es unabhängig gemeldet haben. */
export const MIN_REPORTERS = 3;

export type ReportRow = {
  canonical_title: string | null;
  component: string;
  engine_code: string | null;
  year: number | null;
  mileage_km: number | null;
  cost_eur: number | null;
  reporter_hash: string;
};

export type CommunityIssue = {
  title: string;
  component: string;
  reporters: number;
  typicalFromKm: number | null;
  medianCost: number | null;
  costMin: number | null;
  costMax: number | null;
  risk: Level;
};

const q = (xs: number[], p: number) => {
  if (!xs.length) return null;
  const s = [...xs].sort((a, b) => a - b);
  return s[Math.floor((s.length - 1) * p)];
};

const mostCommon = (xs: string[]) => [...xs].sort((a, b) => xs.filter((x) => x === b).length - xs.filter((x) => x === a).length)[0];

/** Fasst freigegebene Meldungen zu typischen Problemen zusammen – nur mit genug unabhängigen Meldern. */
export function aggregateReports(rows: ReportRow[], v: Vehicle, year: number | null): CommunityIssue[] {
  const code = v.engineCode?.toUpperCase();
  const groups = new Map<string, ReportRow[]>();
  for (const r of rows) {
    if (!r.canonical_title) continue;
    // Anderer Motor oder deutlich andere Generation: gehört nicht zu diesem Auto.
    if (code && r.engine_code && r.engine_code.toUpperCase() !== code) continue;
    if (year && r.year && Math.abs(r.year - year) > 3) continue;
    // Nur nach Titel gruppieren: die KI ordnet dasselbe Problem mal "Motor", mal "Elektrik" zu.
    const key = r.canonical_title.toLowerCase().replace(/\s+/g, " ").trim();
    groups.set(key, [...(groups.get(key) ?? []), r]);
  }
  const out: CommunityIssue[] = [];
  for (const list of groups.values()) {
    const reporters = new Set(list.map((r) => r.reporter_hash)).size;
    if (reporters < MIN_REPORTERS) continue;
    const kms = list.map((r) => r.mileage_km).filter((x): x is number => x !== null && x > 0);
    const costs = list.map((r) => r.cost_eur).filter((x): x is number => x !== null && x > 0);
    const medianCost = q(costs, 0.5);
    out.push({
      title: list[0].canonical_title!,
      component: mostCommon(list.map((r) => r.component)),
      reporters,
      typicalFromKm: q(kms, 0.25),
      medianCost,
      costMin: q(costs, 0.25),
      costMax: q(costs, 0.75),
      risk: reporters >= 5 && (medianCost ?? 0) >= 1500 ? "hoch" : reporters >= 3 && (medianCost ?? 0) >= 500 ? "mittel" : "niedrig",
    });
  }
  return out.sort((a, b) => b.reporters - a.reporters);
}
