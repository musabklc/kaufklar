import type { AnalysisResult } from "../types.ts";

export type Contender = { r: AnalysisResult; monthly: number };

/**
 * Transparente Rangfolge: Gesamtrisiko zählt voll, 5 € Mehrkosten pro Monat = 1 Risikopunkt,
 * schlechtes Preis-Leistungs-Verhältnis bis +10 Punkte. Niedrigste Punktzahl gewinnt.
 */
export function points(c: Contender, minMonthly: number) {
  const value = c.r.scores.value;
  return c.r.scores.overallRisk + (c.monthly - minMonthly) / 5 + (value === null ? 0 : (10 - value) * 1);
}

export function compare(list: Contender[]) {
  const min = Math.min(...list.map((c) => c.monthly));
  const ranked = [...list].sort((a, b) => points(a, min) - points(b, min));
  const [win, second] = ranked;
  const reasons: string[] = [];
  if (second) {
    const dr = second.r.scores.overallRisk - win.r.scores.overallRisk;
    if (dr > 0) reasons.push(`geringeres Gesamtrisiko (${win.r.scores.overallRisk} statt ${second.r.scores.overallRisk})`);
    const dm = Math.round(second.monthly - win.monthly);
    if (dm > 0) reasons.push(`ca. ${dm} € pro Monat günstiger im Unterhalt`);
    if (win.r.scores.value !== null && second.r.scores.value !== null && win.r.scores.value > second.r.scores.value)
      reasons.push(`besseres Preis-Leistungs-Verhältnis (${win.r.scores.value}/10 statt ${second.r.scores.value}/10)`);
    const highWin = win.r.weakPoints.filter((w) => w.relevantNow && w.risk === "hoch").length;
    const highSecond = second.r.weakPoints.filter((w) => w.relevantNow && w.risk === "hoch").length;
    if (highSecond > highWin) reasons.push(`weniger bekannte schwere Schwachstellen (${highWin} statt ${highSecond})`);
    if (!reasons.length) reasons.push("knapp vorne in der Gesamtwertung – die Unterschiede sind gering");
  }
  return { ranked, reasons, points: (c: Contender) => Math.round(points(c, min)) };
}
