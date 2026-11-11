import type { Vehicle } from "../types.ts";

export type EeaRow = {
  Cn: string | null;
  Ft: string | null;
  TAN: string | null;
  "Ec (cm3)": number | null;
  "Ep (KW)": number | null;
  "M (kg)": number | null;
  "E (g/km)": number | null;
  "Enedc (g/km)": number | null;
  "Ewltp (g/km)": number | null;
  Fc: number | null;
  Year: number;
};

export type EeaSummary = {
  matches: number;
  names: string[];
  co2: number | null;
  consumption: number | null;
  ccm: number | null;
  kw: number | null;
  massKg: number | null;
  engineCodes: string[];
  typeApprovals: string[];
};

const MAKES: Record<string, string> = {
  vw: "VOLKSWAGEN", volkswagen: "VOLKSWAGEN", mercedes: "MERCEDES-BENZ", "mercedes-benz": "MERCEDES-BENZ", "mercedes benz": "MERCEDES-BENZ",
  skoda: "SKODA", "škoda": "SKODA", citroen: "CITROEN", "citroën": "CITROEN", "land rover": "LAND ROVER", "alfa romeo": "ALFA ROMEO", "mini": "MINI",
};

/** Marke im EEA-Format. Nur A–Z, Ziffern, Leerzeichen und Bindestrich – der Wert landet in einer SQL-Abfrage. */
export function eeaMake(make: string | null): string | null {
  if (!make) return null;
  const m = make.trim().toLowerCase();
  const out = (MAKES[m] ?? m.toUpperCase()).normalize("NFD").replace(/[̀-ͯ]/g, "");
  return /^[A-Z0-9 -]{2,30}$/.test(out) ? out : null;
}

const FUEL: Record<string, RegExp> = { Diesel: /diesel/i, Benzin: /petrol|benzin/i, Elektro: /electric/i, LPG: /lpg/i, CNG: /\bng\b|cng|biomethan/i };
const ENGINE_CODE = /\b(N47|N57|B37|B38|B47|B48|B57|B58|N20|N13|N43|N52|N55|OM651|OM654|OM642|EA189|EA288|EA211|EA888|EA111)\b/i;
const median = (xs: number[]) => {
  if (!xs.length) return null;
  const s = [...xs].sort((a, b) => a - b);
  return s[Math.floor(s.length / 2)];
};

/** Fasst die EEA-Typzeilen zusammen, die zum Inserat passen (Kraftstoff, Modellname). */
export function summarizeEea(v: Vehicle, rows: EeaRow[]): EeaSummary | null {
  const fuelRe = v.fuel ? FUEL[v.fuel] : undefined;
  let hit = fuelRe ? rows.filter((r) => fuelRe.test(r.Ft ?? "")) : rows;
  // Modellname-Abgleich: z. B. "320d" in "320D TOURING"; nur anwenden, wenn er Treffer übrig lässt.
  const tokens = `${v.model ?? ""} ${v.variant ?? ""}`.toUpperCase().split(/[\s/,-]+/).filter((t) => t.length >= 2 && /\d/.test(t));
  const named = tokens.length ? hit.filter((r) => tokens.some((t) => (r.Cn ?? "").toUpperCase().replace(/\s/g, "").includes(t))) : [];
  if (named.length) hit = named;
  // Modellname (z. B. "GOLF") trennt Modelle mit gleichem Motor (Golf/Tiguan/Passat); nur wenn er in den Daten vorkommt.
  const model = (v.model ?? "").toUpperCase().replace(/[^A-Z0-9]/g, "");
  const byModel = model.length >= 3 ? hit.filter((r) => (r.Cn ?? "").toUpperCase().replace(/[^A-Z0-9]/g, "").includes(model)) : [];
  if (byModel.length) hit = byModel;
  if (!hit.length) return null;

  const num = (f: (r: EeaRow) => number | null) => hit.map(f).filter((x): x is number => typeof x === "number" && x > 0);
  const co2 = median(num((r) => r["Ewltp (g/km)"] ?? r["Enedc (g/km)"] ?? r["E (g/km)"]));
  const codes = new Set(hit.map((r) => (r.Cn ?? "").match(ENGINE_CODE)?.[1]?.toUpperCase()).filter((x): x is string => Boolean(x)));
  return {
    matches: hit.length,
    names: [...new Set(hit.map((r) => r.Cn).filter((x): x is string => Boolean(x)))].slice(0, 6),
    co2: co2 === null ? null : Math.round(co2),
    consumption: median(num((r) => r.Fc)),
    ccm: median(num((r) => r["Ec (cm3)"])),
    kw: median(num((r) => r["Ep (KW)"])),
    massKg: median(num((r) => r["M (kg)"])),
    engineCodes: [...codes],
    // Typgenehmigung ohne Erweiterungsnummer, z. B. "e1*2007/46*0512" – Schlüssel für EU-Rückrufe.
    // Nur wenn das Modell eindeutig erkannt wurde – sonst würden Rückrufe anderer Modelle mit gleichem Motor zugeordnet.
    typeApprovals: !named.length && !byModel.length ? [] : [...new Set(hit.map((r) => (r.TAN ?? "").toLowerCase().split("*").slice(0, 3).join("*")).filter((t) => t.split("*").length === 3))].slice(0, 10),
  };
}

/** Ergänzt nur leere Felder und beschreibt, was ergänzt wurde. Angaben aus dem Inserat werden nie überschrieben. */
export function fillFromEea(v: Vehicle, s: EeaSummary): { vehicle: Vehicle; filled: string[] } {
  const fills: [keyof Vehicle, unknown, string][] = [
    ["co2GPerKm", v.fuel === "Elektro" ? null : s.co2, `CO₂ ${s.co2} g/km`],
    ["consumptionPer100km", s.consumption, `Verbrauch ${String(s.consumption).replace(".", ",")} l/100 km`],
    ["displacementCcm", s.ccm, `Hubraum ${s.ccm} cm³`],
    ["powerKw", s.kw, `Leistung ${s.kw} kW`],
    ["engineCode", s.engineCodes.length === 1 ? s.engineCodes[0] : null, `Motorcode ${s.engineCodes[0]}`],
  ];
  const out: Record<string, unknown> = { ...v };
  const filled: string[] = [];
  for (const [key, value, label] of fills) {
    if (out[key] === null && value !== null) {
      out[key] = value;
      filled.push(label);
    }
  }
  return { vehicle: out as Vehicle, filled };
}
