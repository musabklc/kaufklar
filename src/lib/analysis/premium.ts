import type { AnalysisResult } from "../types.ts";

export const FREE_WEAKPOINTS = 3;
/** Preis des Premium-Berichts in Cent (brutto). Wird so angezeigt und so bei Stripe abgerechnet. */
export const PREMIUM_PRICE_CENTS = 499;
export const premiumPriceText = `${(PREMIUM_PRICE_CENTS / 100).toFixed(2).replace(".", ",")} €`;

/**
 * Kostenlose Fassung: Ersteinschätzung (Urteil, Scores, Inserat-Check, Rückrufe, Motor/Getriebe, die wichtigsten Schwachstellen ohne Kosten).
 * Alles Kostenpflichtige wird hier entfernt, bevor es den Server verlässt – die KI-Rohdaten und Vergleichsangebote eingeschlossen.
 */
export function freeView(r: AnalysisResult): AnalysisResult {
  const shown = r.weakPoints.slice(0, FREE_WEAKPOINTS);
  return {
    ...r,
    locked: { weakPoints: r.weakPoints.length - shown.length },
    weakPoints: shown.map((w) => ({ ...w, costMin: null, costMax: null, detection: "" })),
    dueCosts: [],
    price: { asking: r.price.asking, comps: [], marketEstimate: null, fairMin: null, fairMax: null, note: "" },
    recommendation: { ...r.recommendation, reasons: r.recommendation.reasons.filter((x) => !/€|\d+\/100/.test(x)) },
    checklist: [],
    questions: [],
    testDrive: [],
    negotiation: null,
    summary: { pros: [], cons: [], mustCheck: [] },
    alternatives: [],
    ai: null,
    community: [],
  };
}
