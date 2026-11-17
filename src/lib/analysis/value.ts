/**
 * Was ist mein Auto wert? Aus Angebotspreisen vergleichbarer Autos.
 * Angebotspreise sind Verhandlungsbasis: verkauft wird privat meist etwas darunter, an Händler deutlich darunter.
 */
export type Valuation = { median: number; low: number; high: number; privateSale: [number, number]; dealer: [number, number]; count: number };

const round = (n: number) => Math.round(n / 100) * 100;

export function valuation(prices: number[]): Valuation | null {
  const s = [...prices].filter((p) => p >= 500).sort((a, b) => a - b);
  if (s.length < 3) return null;
  // Ausreißer (Unfallwagen, Fantasiepreise) über den Interquartilsabstand entfernen
  const q = (arr: number[], p: number) => arr[Math.floor((arr.length - 1) * p)];
  const iqr = q(s, 0.75) - q(s, 0.25);
  const kept = s.filter((p) => p >= q(s, 0.25) - 1.5 * iqr && p <= q(s, 0.75) + 1.5 * iqr);
  const median = q(kept, 0.5);
  return {
    median: round(median),
    low: round(q(kept, 0.25)),
    high: round(q(kept, 0.75)),
    privateSale: [round(median * 0.9), round(median * 0.97)],
    dealer: [round(median * 0.72), round(median * 0.85)],
    count: kept.length,
  };
}
