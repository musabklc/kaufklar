/** Was ist beim Preisalarm passiert? Gemeldet wird nur, was sich für Käufer lohnt: Inserat weg oder Preis mind. 1 % (und 50 €) gesunken. */
export function watchEvent(known: number | null, check: { gone: boolean; price: number | null }): { kind: "weg" } | { kind: "gesenkt"; from: number; to: number } | null {
  if (check.gone) return { kind: "weg" };
  if (known === null || check.price === null) return null;
  const drop = known - check.price;
  return drop >= 50 && drop / known >= 0.01 ? { kind: "gesenkt", from: known, to: check.price } : null;
}
