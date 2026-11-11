// Importiert Fahrzeug-Rückrufe aus EU Safety Gate (Europäische Kommission, CC BY 4.0) nach Supabase (Tabelle recalls_eu).
// Aufruf im kaufklar-Ordner:  node scripts/import-safety-gate.mjs [ab-Jahr]   (Standard: 2010)
// Idempotent: bereits vorhandene Fälle werden aktualisiert, nicht doppelt angelegt.
import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";
import { parseCarRecalls, parseWeeklyList, SAFETY_GATE_LIST } from "../src/lib/analysis/safety-gate.ts";

const env = Object.fromEntries(
  readFileSync(".env.local", "utf8").split(/\r?\n/).filter((l) => l.includes("=") && !l.startsWith("#")).map((l) => [l.slice(0, l.indexOf("=")), l.slice(l.indexOf("=") + 1)]),
);
if (!env.SUPABASE_URL || !env.SUPABASE_SECRET_KEY) throw new Error("SUPABASE_URL / SUPABASE_SECRET_KEY fehlen in .env.local");
const db = createClient(env.SUPABASE_URL, env.SUPABASE_SECRET_KEY);
const fromYear = Number(process.argv[2] ?? 2010);

const reports = parseWeeklyList(await (await fetch(SAFETY_GATE_LIST)).text()).filter((r) => r.year >= fromYear);
console.log(`${reports.length} Wochenberichte ab ${fromYear}`);

let total = 0;
for (const [i, r] of reports.entries()) {
  let xml;
  try {
    const res = await fetch(r.url, { signal: AbortSignal.timeout(30_000) });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    xml = await res.text();
  } catch (e) {
    console.warn(`Bericht übersprungen (${e.message}): ${r.url}`);
    continue;
  }
  const rows = parseCarRecalls(xml);
  if (rows.length) {
    const { error } = await db.from("recalls_eu").upsert(rows, { onConflict: "case_number" });
    if (error) throw new Error(`Supabase: ${error.message}`);
    total += rows.length;
  }
  if (i % 50 === 0) console.log(`${i + 1}/${reports.length} Berichte, ${total} Pkw-Rückrufe`);
}
console.log(`Fertig: ${total} Pkw-Rückrufe importiert/aktualisiert.`);
