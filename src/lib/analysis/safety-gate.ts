import type { Recall } from "./recalls.ts";

/** EU Safety Gate (Europäische Kommission, CC BY 4.0): Liste aller Wochenberichte. */
export const SAFETY_GATE_LIST = "https://ec.europa.eu/safety-gate-alerts/api/download/weeklyReport/list/xml/en";

const tag = (xml: string, name: string) => {
  const m = xml.match(new RegExp(`<${name}(?:\\s[^>]*)?>([\\s\\S]*?)</${name}>`));
  return m ? m[1].replace(/^<!\[CDATA\[|\]\]>$/g, "").replace(/\s+/g, " ").trim() || null : null;
};
const toDate = (s: string | null) => {
  const m = s?.match(/(\d{2})[-/](\d{2})[-/](\d{4})/);
  return m ? `${m[3]}-${m[2]}-${m[1]}` : null;
};

/** Wochenberichte aus der Liste, neueste zuerst. */
export function parseWeeklyList(xml: string): { year: number; url: string }[] {
  return [...xml.matchAll(/<weeklyReport>([\s\S]*?)<\/weeklyReport>/g)]
    .map((m) => ({ year: Number(tag(m[1], "year")), url: tag(m[1], "URL")?.replace(/&amp;/g, "&") ?? "" }))
    .filter((r) => r.url);
}

/** Nur Pkw-Rückrufe aus einem Wochenbericht. */
export function parseCarRecalls(xml: string): Recall[] {
  return [...xml.matchAll(/<notifications[^>]*>([\s\S]*?)<\/notifications>/g)]
    .map((m) => m[1])
    .filter((n) => tag(n, "category") === "Motor vehicles" && /passenger car/i.test(tag(n, "product") ?? ""))
    .map((n) => ({
      case_number: tag(n, "caseNumber") ?? "",
      published: toDate(tag(n, "publicationDate")),
      brand: tag(n, "brand") ?? "",
      name: tag(n, "name"),
      type_approval: tag(n, "type_numberOfModel"),
      production_dates: tag(n, "productionDates"),
      risk_type: tag(n, "riskType"),
      danger: tag(n, "danger"),
      measures: tag(n, "measures"),
      url: tag(n, "reference"),
    }))
    .filter((x) => x.case_number && x.brand);
}
