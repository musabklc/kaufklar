export type ServiceEntry = { date: string; km: number | null; work: string; workshop: string | null };
export type ServiceCheck = { level: "ok" | "warn" | "bad"; text: string };

const fmtKm = (n: number) => `${n.toLocaleString("de-DE")} km`;
/** "05/2020" oder "5.2020" → Monate seit Jahr 0 (zum Rechnen), sonst null. */
export function monthIndex(s: string): number | null {
  const m = s.trim().match(/^(\d{1,2})[./](\d{4})$/);
  return m && +m[1] >= 1 && +m[1] <= 12 ? +m[2] * 12 + (+m[1] - 1) : null;
}

/**
 * Plausibilität des Scheckhefts – gerechnet, nicht geraten:
 * sinkende Kilometer (Tachomanipulation), große Lücken, letzter Eintrag passt nicht zum Inserat, letzter Service lange her.
 */
export function checkServiceBook(entries: ServiceEntry[], listingKm: number | null, now: Date): ServiceCheck[] {
  const dated = entries
    .map((e) => ({ ...e, m: monthIndex(e.date) }))
    .filter((e): e is ServiceEntry & { m: number } => e.m !== null)
    .sort((a, b) => a.m - b.m);
  if (!dated.length) return [{ level: "warn", text: "Keine lesbaren Einträge mit Datum gefunden. Bitte die Seiten schärfer fotografieren oder Rechnungen zeigen lassen." }];
  const out: ServiceCheck[] = [];
  let problems = 0;
  for (let i = 1; i < dated.length; i++) {
    const a = dated[i - 1];
    const b = dated[i];
    if (a.km !== null && b.km !== null && b.km < a.km) {
      out.push({ level: "bad", text: `Kilometer sinken: ${a.date} ${fmtKm(a.km)} → ${b.date} ${fmtKm(b.km)}. Das ist ein starkes Zeichen für einen manipulierten Tacho oder falsche Einträge.` });
      problems++;
    }
    const gapMonths = b.m - a.m;
    if (gapMonths > 26) {
      out.push({ level: "warn", text: `Lücke von ${Math.round(gapMonths / 12 * 10) / 10} Jahren zwischen ${a.date} und ${b.date}. Nach Rechnungen aus dieser Zeit fragen.` });
      problems++;
    } else if (a.km !== null && b.km !== null && b.km - a.km > 40000) {
      out.push({ level: "warn", text: `${fmtKm(b.km - a.km)} zwischen zwei Einträgen (${a.date} → ${b.date}) – mehr als ein übliches Service-Intervall.` });
      problems++;
    }
  }
  const last = dated[dated.length - 1];
  // Höchster Stand im Heft (nicht der letzte – der kann ja gerade manipuliert sein)
  const kms = dated.map((e) => e.km).filter((k): k is number => k !== null);
  const maxKm = kms.length ? Math.max(...kms) : null;
  if (listingKm !== null && maxKm !== null && maxKm > listingKm + 500) {
    out.push({ level: "bad", text: `Im Heft stehen schon ${fmtKm(maxKm)}, im Inserat aber nur ${fmtKm(listingKm)}. Tacho und Papiere genau prüfen.` });
    problems++;
  }
  const sinceLast = now.getFullYear() * 12 + now.getMonth() - last.m;
  if (sinceLast > 24) {
    out.push({ level: "warn", text: `Der letzte Eintrag ist von ${last.date}, also ${Math.floor(sinceLast / 12)} Jahre her. Fällige Wartung in den Preis einrechnen.` });
    problems++;
  }
  const belt = [...dated].reverse().find((e) => /zahnriemen/i.test(e.work));
  if (belt) out.push({ level: "ok", text: `Zahnriemen laut Heft gewechselt: ${belt.date}${belt.km !== null ? ` bei ${fmtKm(belt.km)}` : ""}.` });
  if (!problems) out.unshift({ level: "ok", text: `${dated.length} Einträge von ${dated[0].date} bis ${last.date}, Kilometer steigen stimmig, keine großen Lücken.` });
  return out;
}
