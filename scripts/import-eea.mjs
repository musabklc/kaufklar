// Importiert EU-Typdaten (EEA CO2-Monitoring Pkw, CC BY 4.0) nach Supabase (Tabelle vehicle_types).
// Aufruf im kaufklar-Ordner:  node scripts/import-eea.mjs [vonJahr] [bisJahr]   (Standard 2010 2025)
// Idempotent (Upsert über den Primärschlüssel). Dauer: ca. 1 Minute pro Jahr.
import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

const env = Object.fromEntries(
  readFileSync(".env.local", "utf8").split(/\r?\n/).filter((l) => l.includes("=") && !l.startsWith("#")).map((l) => [l.slice(0, l.indexOf("=")), l.slice(l.indexOf("=") + 1)]),
);
const db = createClient(env.SUPABASE_URL, env.SUPABASE_SECRET_KEY);
const [from = 2010, to = 2025] = process.argv.slice(2).map(Number);

// Neuere Jahrgänge liegen in eigenen Tabellen (Stand 11/2026).
const TABLE = { 2023: "co2cars_2023Fv28", 2024: "co2cars_2024Pv29", 2025: "co2cars_2025Pv31" };
const COLS = "Mk, Cn, Ft, [Ec (cm3)], [Ep (KW)], [M (kg)], [E (g/km)], [Enedc (g/km)], [Ewltp (g/km)], Fc, TAN";
const ENGINE = /\b(N47|N57|B37|B38|B47|B48|B57|B58|N20|N13|N43|N52|N55|OM651|OM654|OM642|EA189|EA288|EA211|EA888|EA111)\b/i;
const median = (xs) => (xs.length ? [...xs].sort((a, b) => a - b)[Math.floor(xs.length / 2)] : null);
const int = (x) => (Number.isFinite(Number(x)) ? Math.round(Number(x)) : 0); // manche Zeilen haben keinen Zahlenwert
const mode = (xs) => (xs.length ? [...xs].sort((a, b) => xs.filter((x) => x === b).length - xs.filter((x) => x === a).length)[0] : null);

async function page(year, p) {
  const table = TABLE[year] ?? "co2cars";
  const url = "https://discodata.eea.europa.eu/sql?" + new URLSearchParams({ query: `SELECT DISTINCT ${COLS} FROM [CO2Emission].[latest].[${table}] WHERE Year=${year}`, p: String(p), nrOfHits: "10000" });
  for (let attempt = 1; ; attempt++) {
    const res = await fetch(url, { signal: AbortSignal.timeout(120_000) }).catch((e) => ({ ok: false, status: e.message }));
    const body = res.ok ? await res.json().catch(() => ({})) : {};
    if (Array.isArray(body.results)) return body.results; // Fehlerantworten ("errors") nicht als leere Seite werten

    if (attempt >= 4) throw new Error(`EEA ${year} Seite ${p}: ${res.status}`);
    await new Promise((r) => setTimeout(r, 5000 * attempt));
  }
}

for (let year = from; year <= to; year++) {
  const groups = new Map();
  let raw = 0;
  for (let p = 1; ; p++) {
    const rows = await page(year, p);
    raw += rows.length;
    for (const r of rows) {
      const make = (r.Mk ?? "").trim().toUpperCase();
      const name = (r.Cn ?? "").trim().toUpperCase().replace(/\s+/g, " ");
      if (!make || !name) continue;
      const fields = { make, name, fuel: (r.Ft ?? "").trim().toLowerCase(), ccm: int(r["Ec (cm3)"]), kw: int(r["Ep (KW)"]) };
      const key = JSON.stringify(fields); // Felder direkt speichern – Namen können Trennzeichen enthalten
      const g = groups.get(key) ?? { fields, co2: [], fc: [], mass: [], tan: [], n: 0 };
      const co2 = r["Ewltp (g/km)"] ?? r["Enedc (g/km)"] ?? r["E (g/km)"];
      if (co2 > 0) g.co2.push(co2);
      if (r.Fc > 0) g.fc.push(r.Fc);
      if (r["M (kg)"] > 0) g.mass.push(r["M (kg)"]);
      const tan = (r.TAN ?? "").toLowerCase().split("*").slice(0, 3).join("*");
      if (tan.split("*").length === 3) g.tan.push(tan);
      g.n++;
      groups.set(key, g);
    }
    if (rows.length < 10000) break;
  }
  const out = [...groups.values()].map((g) => {
    const { make, name, fuel, ccm, kw } = g.fields;
    return {
      make, name, fuel, ccm, kw, year,
      co2: median(g.co2) === null ? null : Math.round(median(g.co2)),
      fc: median(g.fc), mass_kg: median(g.mass), tan: mode(g.tan), engine_code: name.match(ENGINE)?.[1]?.toUpperCase() ?? null, n: g.n,
    };
  });
  for (let i = 0; i < out.length; i += 1000) {
    const { error } = await db.from("vehicle_types").upsert(out.slice(i, i + 1000), { onConflict: "make,name,fuel,ccm,kw,year" });
    if (error) throw new Error(`Supabase ${year}: ${error.message}`);
  }
  console.log(`${year}: ${raw} Typzeilen → ${out.length} Einträge gespeichert`);
}
console.log("Fertig.");
