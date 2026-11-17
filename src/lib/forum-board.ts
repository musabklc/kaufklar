import type { AnalysisResult } from "./types.ts";

const BOARDS: [RegExp, string][] = [
  [/^audi/i, "audi"],
  [/^bmw|^mini/i, "bmw"],
  [/^mercedes|^smart/i, "mercedes"],
  [/^(vw|volkswagen)/i, "vw"],
  [/^opel/i, "opel"],
  [/^ford/i, "ford"],
  [/^(skoda|škoda)/i, "skoda"],
  [/^(seat|cupra)/i, "seat-cupra"],
  [/^(toyota|lexus)/i, "toyota"],
  [/^(hyundai|kia)/i, "hyundai-kia"],
  [/^(renault|dacia)/i, "renault-dacia"],
  [/^(peugeot|citro[eë]n|ds\b)/i, "peugeot-citroen"],
  [/^mazda/i, "mazda"],
  [/^volvo/i, "volvo"],
  [/^tesla/i, "elektro"],
];

/** Passendes Unterforum zur Marke; unbekannte Marken landen bei "Sonstige", Elektroautos bei "Elektro". */
export function boardFor(make: string | null, fuel?: string | null): string {
  if (fuel === "Elektro") return "elektro";
  return BOARDS.find(([re]) => re.test((make ?? "").trim()))?.[1] ?? "sonstige";
}

const fmt = (n: number) => n.toLocaleString("de-DE");

/** Vorschlag für ein neues Thema "Was haltet ihr von diesem Auto?" aus einer Analyse (Nutzer kann alles ändern). */
export function askDraft(r: AnalysisResult): { board: string; title: string; body: string } {
  const v = r.vehicle;
  const car = [v.make, v.model, v.variant].filter(Boolean).join(" ") || "dieses Auto";
  const facts = [
    v.firstRegistration && `EZ ${v.firstRegistration}`,
    v.mileageKm && `${fmt(v.mileageKm)} km`,
    v.priceEur && `${fmt(v.priceEur)} €`,
    v.fuel,
    v.transmission,
  ].filter(Boolean).join(", ");
  const risks = r.weakPoints.filter((w) => w.relevantNow && w.risk !== "niedrig").slice(0, 3).map((w) => w.title);
  const body = [
    `Ich überlege, diesen ${car} zu kaufen${facts ? ` (${facts})` : ""}.`,
    `Tachoklar sagt: ${r.recommendation.verdict}.${risks.length ? ` Genannte Risiken: ${risks.join(", ")}.` : ""}`,
    v.listingUrl ? `Inserat: ${v.listingUrl}` : "",
    "Hat jemand Erfahrung mit dem Modell? Worauf sollte ich bei der Besichtigung achten?",
  ].filter(Boolean).join("\n\n");
  return { board: boardFor(v.make, v.fuel), title: `${car}${v.firstRegistration ? ` (${v.firstRegistration.slice(-4)})` : ""} – lohnt sich der Kauf?`.slice(0, 120), body: body.slice(0, 4000) };
}
