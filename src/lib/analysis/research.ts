import { parseYear } from "./knowledge.ts";
import type { Vehicle } from "../types.ts";

const MAKES: Record<string, string> = { vw: "volkswagen", mercedes: "mercedes-benz", "mb": "mercedes-benz", škoda: "skoda" };
const norm = (s: string | null) => (s ?? "").toLowerCase().trim().replace(/\s+/g, " ");

/**
 * Schlüssel für die gespeicherte Recherche: gleiche Marke, Modell, Kraftstoff, Motor (Code oder Hubraum) und Baujahr-Block (3 Jahre).
 * null = zu wenig Angaben, um sicher denselben Typ zu treffen (dann wird nicht recherchiert).
 */
export function researchKey(v: Vehicle): { key: string; label: string } | null {
  const year = parseYear(v.firstRegistration);
  const rawMake = norm(v.make);
  const make = MAKES[rawMake] ?? MAKES[rawMake.split(/[\s-]/)[0]] ?? rawMake;
  const model = norm(v.model).replace(/^(mercedes-benz|mercedes|bmw|audi|vw|volkswagen)\s+/, "").split(" ")[0];
  if (!make || !model || !year || !v.fuel) return null;
  const code = v.engineCode?.toUpperCase().replace(/\s/g, "") || null;
  const litres = v.displacementCcm ? (Math.round(v.displacementCcm / 100) / 10).toFixed(1) : null;
  if (!code && !litres) return null;
  const from = year - (year % 3);
  const engine = code ?? `${litres}l`;
  return {
    key: [make, model, norm(v.fuel), engine.toLowerCase(), `${from}-${from + 2}`].join("|"),
    label: `${v.make} ${v.model}, ${v.fuel}, ${code ? `Motor ${code}` : `${litres?.replace(".", ",")} l`}, Baujahr ${from}–${from + 2}`,
  };
}
