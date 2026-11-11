import type { CostItem, Vehicle } from "../types.ts";

/**
 * Kfz-Steuer nach Kraftfahrzeugsteuergesetz (KraftStG) für Pkw.
 * - EZ bis 30.06.2009: Hubraum × Satz nach Schadstoffklasse (wir nehmen Euro 4 oder besser an – häufigster Fall).
 * - EZ ab 01.07.2009: Sockelbetrag je angefangene 100 cm³ (Benzin 2,00 €, Diesel 9,50 €) + CO2-Komponente
 *   über Freibetrag (bis 2011: 120 g, 2012–2013: 110 g, 2014–2020: 95 g je 2,00 €/g; ab 2021: 95 g, progressiv).
 * - Elektroautos: steuerbefreit (Befreiung für Erstzulassungen bis Ende 2030, längstens bis 31.12.2035).
 */
export function kfzSteuer(v: Vehicle, ez: Date | null): { amount: number | null; note: string } {
  if (v.fuel === "Elektro") return { amount: 0, note: "E-Auto: steuerbefreit (Befreiung längstens bis 31.12.2035)." };
  if (!ez) return { amount: null, note: "Erstzulassung fehlt – Steuer nicht berechenbar." };
  if (!v.displacementCcm) return { amount: null, note: "Hubraum fehlt – Steuer nicht berechenbar." };
  const diesel = v.fuel === "Diesel";
  const units = Math.ceil(v.displacementCcm / 100);

  if (ez < new Date(2009, 6, 1)) {
    const amount = Math.floor(units * (diesel ? 15.44 : 6.75));
    return { amount, note: "Altfahrzeug (EZ vor 07/2009): berechnet für Schadstoffklasse Euro 4 oder besser." };
  }
  if (v.co2GPerKm === null) return { amount: null, note: "CO₂-Wert fehlt – bitte aus dem Inserat oder Fahrzeugschein (Feld V.7) ergänzen." };

  const base = units * (diesel ? 9.5 : 2);
  const y = ez.getFullYear();
  const co2 = v.co2GPerKm;
  let co2Part: number;
  if (y >= 2021) {
    const steps: [number, number][] = [[115, 2.0], [135, 2.2], [155, 2.5], [175, 2.9], [195, 3.4], [Infinity, 4.0]];
    co2Part = 0;
    let lower = 95;
    for (const [upper, rate] of steps) {
      if (co2 <= lower) break;
      co2Part += (Math.min(co2, upper) - lower) * rate;
      lower = upper;
    }
  } else {
    const free = y <= 2011 ? 120 : y <= 2013 ? 110 : 95;
    co2Part = Math.max(0, co2 - free) * 2;
  }
  const hybridNote = v.fuel === "Hybrid" || v.fuel === "Plug-in-Hybrid" ? " Hybrid als Benziner gerechnet." : "";
  return { amount: Math.floor(base + co2Part), note: `Nach KraftStG (EZ ${y}, ${v.displacementCcm} cm³, ${co2} g CO₂/km).${hybridNote}` };
}

export const FUEL_DEFAULT: Record<string, number> = { Benzin: 1.75, Diesel: 1.65, Hybrid: 1.75, "Plug-in-Hybrid": 1.75, Elektro: 0.35, LPG: 0.95, CNG: 1.3, Sonstige: 1.75 };

export type CostInputs = { kmPerYear: number; fuelPrice: number; insurancePerYear: number | null; maintenancePerYear: number };

export function defaultCostInputs(v: Vehicle, age: number | null): CostInputs {
  return {
    kmPerYear: 12000,
    fuelPrice: FUEL_DEFAULT[v.fuel ?? "Benzin"] ?? 1.75,
    insurancePerYear: null,
    maintenancePerYear: age === null ? 700 : age < 5 ? 400 : age <= 10 ? 700 : 1000,
  };
}

export type MonthlyCosts = {
  lines: { label: string; perMonth: number | null; note: string }[];
  total: number;
  complete: boolean;
};

export function monthlyCosts(v: Vehicle, ez: Date | null, inp: CostInputs, due: CostItem[]): MonthlyCosts {
  const tax = kfzSteuer(v, ez);
  const unit = v.fuel === "Elektro" ? "kWh" : "l";
  const fuel = v.consumptionPer100km === null ? null : (v.consumptionPer100km / 100) * inp.kmPerYear * inp.fuelPrice;
  const dueYear = due.reduce((s, c) => s + (c.min + c.max) / 2, 0);
  const lines = [
    { label: "Kfz-Steuer", perMonth: tax.amount === null ? null : tax.amount / 12, note: tax.note },
    {
      label: v.fuel === "Elektro" ? "Strom" : "Kraftstoff",
      perMonth: fuel === null ? null : fuel / 12,
      note: fuel === null ? "Verbrauch fehlt – bitte ergänzen." : `${v.consumptionPer100km} ${unit}/100 km × ${inp.kmPerYear.toLocaleString("de-DE")} km × ${inp.fuelPrice.toFixed(2).replace(".", ",")} €/${unit}`,
    },
    { label: "Versicherung", perMonth: inp.insurancePerYear === null ? null : inp.insurancePerYear / 12, note: inp.insurancePerYear === null ? "Hängt von dir ab – Beitrag eintragen." : "dein Beitrag" },
    { label: "Wartung & Verschleiß", perMonth: inp.maintenancePerYear / 12, note: "Faustwert nach Fahrzeugalter, anpassbar" },
    ...(dueYear ? [{ label: "Absehbare Reparaturen (1. Jahr)", perMonth: dueYear / 12, note: due.map((d) => d.title).join(", ") }] : []),
  ].map((l) => ({ ...l, perMonth: l.perMonth === null ? null : Math.round(l.perMonth) }));
  return { lines, total: lines.reduce((s, l) => s + (l.perMonth ?? 0), 0), complete: lines.every((l) => l.perMonth !== null) };
}
