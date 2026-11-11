import type { Vehicle } from "../types.ts";

export type Recall = {
  case_number: string;
  published: string | null;
  brand: string;
  name: string | null;
  type_approval: string | null;
  production_dates: string | null;
  risk_type: string | null;
  danger: string | null;
  measures: string | null;
  url: string | null;
};
export type MatchedRecall = Recall & { matchedBy: "Typgenehmigung" | "Modellname" };

/** Markenname so, wie er in Safety Gate steht (für die Datenbanksuche). */
export function recallBrand(make: string | null): string | null {
  const m = (make ?? "").trim().toLowerCase();
  if (!m) return null;
  return ({ vw: "volkswagen", mercedes: "mercedes", "mercedes-benz": "mercedes", "škoda": "skoda", "citroën": "citro" } as Record<string, string>)[m] ?? m;
}

const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/**
 * Ordnet EU-Rückrufe dem Fahrzeug zu: zuerst exakt über die Typgenehmigungsnummer (aus den EU-Typdaten),
 * sonst über den Modellnamen. Rückrufe, deren Produktionszeitraum das Baujahr klar ausschließt, entfallen.
 */
export function matchRecalls(v: Vehicle, typeApprovals: string[], rows: Recall[], year: number | null): MatchedRecall[] {
  const tans = typeApprovals.map((t) => t.toLowerCase());
  // "3er" → auch "3 Series"; Modellname als ganzes Wort, damit "X3" nicht auf "3er" passt.
  const model = (v.model ?? "").trim().toLowerCase();
  const names = model.length >= 2 ? [model, ...(/^(\d)er$/.test(model) ? [`${model[0]} series`] : [])] : [];
  const nameRe = names.length ? new RegExp(`(^|[\\s,/(-])(${names.map(escape).join("|")})($|[\\s,/)-])`, "i") : null;

  const out: MatchedRecall[] = [];
  for (const r of rows) {
    const years = (r.production_dates ?? "").match(/(19|20)\d{2}/g)?.map(Number) ?? [];
    if (year && years.length && (year < Math.min(...years) || year > Math.max(...years) + 1)) continue;
    const ta = (r.type_approval ?? "").toLowerCase();
    if (tans.some((t) => ta.includes(t))) out.push({ ...r, matchedBy: "Typgenehmigung" });
    else if (nameRe && nameRe.test(` ${r.name ?? ""} ${r.type_approval ?? ""} `)) out.push({ ...r, matchedBy: "Modellname" });
  }
  return out.sort((a, b) => (b.published ?? "").localeCompare(a.published ?? "")).slice(0, 10);
}
