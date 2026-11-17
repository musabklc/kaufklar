import { matchKnowledge, parseYear, type KbEntry } from "./knowledge.ts";
import type {
  AiAudit,
  Alternative,
  Comp,
  AnalysisResult,
  ChecklistSection,
  CostItem,
  DataQuality,
  Identification,
  Finding,
  GuideSection,
  Level,
  Negotiation,
  Price,
  Recommendation,
  ResearchEntry,
  Scores,
  Vehicle,
  WeakPoint,
} from "../types.ts";

const W: Record<Level, number> = { niedrig: 0.5, mittel: 1, hoch: 2 };
const LEVEL_ORDER: Record<Level, number> = { hoch: 0, mittel: 1, niedrig: 2 };
const clamp = (n: number, a: number, b: number) => Math.min(b, Math.max(a, n));
const r100 = (n: number) => Math.round(n / 100) * 100;
export const eur = (n: number) => `${n.toLocaleString("de-DE")} €`;

/** Wartungspunkte: gelten als offen, wenn Service/Beschreibung den Nachweis nicht erwähnen. */
const MAINT: Record<string, RegExp> = {
  "ea189-zr": /zahnriemen/,
  "ea288-zr": /zahnriemen/,
  "eco-riemen": /zahnriemen/,
  "puretech-riemen": /riemen/,
  "dsgnass-oel": /(getriebe|dsg)[^.]{0,25}öl|öl[^.]{0,25}(getriebe|dsg)/,
  "dl501-oel": /(getriebe|s.?tronic)[^.]{0,25}öl|öl[^.]{0,25}(getriebe|s.?tronic)/,
  "8hp-oel": /(getriebe|automatik)[^.]{0,25}öl|öl[^.]{0,25}(getriebe|automatik)/,
  "7g-oel": /(getriebe|automatik)[^.]{0,25}öl|öl[^.]{0,25}(getriebe|automatik)/,
};

/** Steht im Inserat, dass das Bauteil schon erneuert wurde (z. B. "Steuerkette 2021 neu")? */
export function fixedInListing(title: string, text: string): boolean {
  const kw = title.toLowerCase().split(/[\s/(,]/)[0].replace(/[^a-zäöüß0-9-]/g, "");
  if (kw.length < 4) return false;
  const done = "(neu|getauscht|erneuert|gewechselt|ersetzt|gemacht|instand gesetzt)";
  const gap = (n: number) => `(?:[^.!]|\\.(?=\\d)){0,${n}}`; // im selben Satz; Punkte in Zahlen wie "140.000" zählen nicht als Satzende
  return new RegExp(`${kw}${gap(50)}${done}|${done}[a-zäöü]*${gap(25)}${kw}`, "i").test(text);
}

export function parseMonthYear(s: string | null): Date | null {
  const m = s?.match(/(?:(\d{1,2})\s*[./-]\s*)?((?:19|20)\d{2})/);
  if (!m) return null;
  return new Date(Number(m[2]), m[1] ? Number(m[1]) - 1 : 6, 1);
}

function quantile(sorted: number[], q: number) {
  const pos = (sorted.length - 1) * q;
  const lo = Math.floor(pos);
  return sorted[lo] + (sorted[Math.min(lo + 1, sorted.length - 1)] - sorted[lo]) * (pos - lo);
}

export type BuildInput = {
  id: string;
  vehicle: Vehicle;
  comps: Comp[];
  ai: AiAudit | null;
  aiNote: string | null;
  alternatives?: Alternative[];
  dataNotes?: string[];
  recalls?: AnalysisResult["recalls"];
  community?: AnalysisResult["community"];
  research?: ResearchEntry | null;
  now?: Date;
};

/** Betrifft ein Punkt die HU/TÜV? Das beurteilt nur die Regelprüfung, nie die KI. */
export const isHuTopic = (text: string) => /\b(HU|TÜV|Hauptuntersuchung|Prüfplakette|Plakette)\b/i.test(text);

/**
 * Kann die HU so weit in der Zukunft liegen? Nach einer frischen HU gilt sie 24 Monate, beim Neuwagen die erste 36 Monate.
 * Einen Monat Spielraum, weil im Inserat nur Monat/Jahr steht.
 */
export function huPlausible(hu: Date, now: Date, ageYears: number | null): boolean {
  const months = (hu.getFullYear() - now.getFullYear()) * 12 + (hu.getMonth() - now.getMonth());
  const allowed = ageYears !== null && ageYears < 3 ? 36 : 24;
  return months <= allowed + 1;
}

export function buildAnalysis({ id, vehicle: v, comps: rawComps, ai, aiNote, alternatives = [], dataNotes = [], recalls = [], community = [], research = null, now = new Date() }: BuildInput): AnalysisResult {
  const km = v.mileageKm;
  const reg = parseMonthYear(v.firstRegistration);
  const age = reg ? Math.max(0, (now.getTime() - reg.getTime()) / (365.25 * 864e5)) : null;
  const text = `${v.serviceHistory ?? ""} ${v.description ?? ""} ${v.knownDamage ?? ""}`.toLowerCase();
  const desc = (v.description ?? "").toLowerCase();
  const isEv = v.fuel === "Elektro" || v.fuel === "Plug-in-Hybrid";

  // ---------- Schwachstellen ----------
  const kb = matchKnowledge(v);
  const relevant = (from: number | null) => from === null || km === null || km >= from * 0.85;
  const weakPoints: WeakPoint[] = kb.flatMap((e) =>
    e.weakPoints.map((w) => {
      const fixed = fixedInListing(w.title, text);
      return {
      id: w.id,
      title: w.title,
      component: w.component,
      detail: fixed ? `${w.detail} Laut Inserat bereits erneuert – lass dir die Rechnung zeigen.` : w.detail,
      risk: w.risk,
      costMin: w.costMin,
      costMax: w.costMax,
      relevantFromKm: w.relevantFromKm,
      detection: w.detection,
      provenance: "modelltypisch" as const,
      origin: fixed ? `${e.name} · laut Inserat erledigt` : e.name,
      relevantNow: !fixed && relevant(w.relevantFromKm),
    };
    }),
  );

  const wear = (id: string, title: string, component: string, detail: string, risk: Level, min: number | null, max: number | null, detection: string) =>
    weakPoints.push({ id, title, component, detail, risk, costMin: min, costMax: max, relevantFromKm: null, detection, provenance: "pruefen", origin: "Verschleiß bei Alter/Laufleistung", relevantNow: true });

  if (v.transmission === "Schaltgetriebe" && km !== null && km >= 150000 && !/kupplung/.test(text))
    wear("w-kupplung", "Kupplung / Zweimassenschwungrad", "Getriebe", "Bei dieser Laufleistung ist Verschleiß wahrscheinlich, sofern nicht bereits erneuert.", "mittel", 800, 2000, "Kupplung greift sehr hoch, rutscht beim Beschleunigen im hohen Gang, Klappern im Leerlauf.");
  if (km !== null && km >= 120000)
    wear("w-fahrwerk", "Stoßdämpfer und Fahrwerksbuchsen", "Fahrwerk", "Verschleißteile, die ab dieser Laufleistung häufig fällig werden.", "niedrig", 400, 1200, "Poltern über Unebenheiten, schwammiges Fahrverhalten, Ölfeuchte an Dämpfern.");
  if (age !== null && age >= 10)
    wear("w-rost", "Rost, Bremsleitungen, Gummilager", "Karosserie", "Ab etwa 10 Jahren steigt das Risiko für Korrosion und alternde Gummiteile.", "mittel", 200, 1500, "Unterboden, Schweller, Radläufe und Bremsleitungen ansehen.");
  if (isEv)
    wear("w-hv", "Zustand der Hochvoltbatterie (SoH)", "Elektrik", "Die Batteriegesundheit bestimmt Reichweite und Wert maßgeblich.", "mittel", null, null, "Batteriezertifikat / SoH-Auslesung verlangen.");

  // Gespeicherte Typ-Recherche (KI + Google-Suche, mit Quellen) – nur, was die Datenbank noch nicht abdeckt
  if (research) {
    const known = weakPoints.map((w) => w.title.toLowerCase().split(/[\s/(]/)[0]).filter((k) => k.length > 3);
    const stand = new Date(research.researchedAt).toLocaleDateString("de-DE", { month: "2-digit", year: "numeric" });
    research.weakPoints
      .filter((i) => !known.some((k) => i.title.toLowerCase().includes(k)))
      .forEach((i, n) =>
        weakPoints.push({
          id: `r-${n}`,
          title: i.title,
          component: i.component,
          detail: i.detail,
          risk: i.risk,
          costMin: i.costMinEur,
          costMax: i.costMaxEur,
          relevantFromKm: i.relevantFromKm,
          detection: i.howToDetect,
          provenance: "recherche",
          origin: `Recherche zu ${research.label || research.identifiedAs} (Stand ${stand})`,
          relevantNow: relevant(i.relevantFromKm),
          sources: research.sources,
        }),
      );
  }

  if (ai) {
    const kbKeys = weakPoints.map((w) => w.title.toLowerCase().split(/[\s/(]/)[0]).filter((k) => k.length > 3);
    ai.modelIssues
      .filter((i) => !kbKeys.some((k) => i.title.toLowerCase().includes(k)))
      .forEach((i, n) =>
        weakPoints.push({
          id: `ai-${n}`,
          title: i.title,
          component: i.component,
          detail: i.detail,
          risk: i.risk,
          costMin: i.costMinEur,
          costMax: i.costMaxEur,
          relevantFromKm: i.relevantFromKm,
          detection: i.howToDetect,
          provenance: "ki",
          origin: "KI-Einschätzung (nicht in der Datenbank verifiziert)",
          relevantNow: relevant(i.relevantFromKm),
        }),
      );
  }
  // Von Kunden gemeldete Probleme (nur mit genug unabhängigen Meldern, siehe aggregateReports).
  const known = weakPoints.map((w) => w.title.toLowerCase().split(/[\s/(]/)[0]).filter((k) => k.length > 3);
  community
    .filter((c) => !known.some((k) => c.title.toLowerCase().includes(k)))
    .forEach((c, n) =>
      weakPoints.push({
        id: `c-${n}`,
        title: c.title,
        component: c.component,
        detail: `Von ${c.reporters} Tachoklar-Nutzern unabhängig gemeldet${c.medianCost ? `, mittlere Reparaturkosten ca. ${eur(c.medianCost)}` : ""}${c.typicalFromKm ? `, meist ab ca. ${c.typicalFromKm.toLocaleString("de-DE")} km` : ""}.`,
        risk: c.risk,
        costMin: c.costMin,
        costMax: c.costMax,
        relevantFromKm: c.typicalFromKm,
        detection: "Beim Verkäufer gezielt nachfragen und bei der Besichtigung prüfen (lassen).",
        provenance: "nutzer",
        origin: `Tachoklar-Community (${c.reporters} Meldungen)`,
        relevantNow: relevant(c.typicalFromKm),
      }),
    );
  weakPoints.sort((a, b) => Number(b.relevantNow) - Number(a.relevantNow) || LEVEL_ORDER[a.risk] - LEVEL_ORDER[b.risk]);

  // ---------- Inserat-Prüfung ----------
  const findings: Finding[] = [];
  const f = (title: string, detail: string, status: Finding["status"], severity: Level, evidence: string) =>
    findings.push({ title, detail, status, severity, evidence, provenance: status === "bestaetigt" ? "gesichert" : "pruefen" });

  const keyFields: [keyof Vehicle, string][] = [
    ["firstRegistration", "Erstzulassung"],
    ["mileageKm", "Kilometerstand"],
    ["powerKw", "Leistung"],
    ["fuel", "Kraftstoff"],
    ["transmission", "Getriebe"],
    ["priceEur", "Preis"],
    ["previousOwners", "Vorbesitzer"],
    ["accidentStatus", "Unfallfreiheit"],
    ["inspectionDue", "HU/TÜV"],
    ["serviceHistory", "Servicehistorie"],
  ];
  const missing = keyFields.filter(([k]) => v[k] === null).map(([, l]) => l);
  if (missing.length)
    f(`Fehlende Angaben: ${missing.join(", ")}`, "Diese Informationen fehlen im Inserat. Das muss nicht verdächtig sein, sollte aber vor dem Kauf geklärt werden.", "pruefen", missing.length >= 3 ? "mittel" : "niedrig", "Inseratsdaten");

  if (km !== null && age !== null && age >= 2) {
    const perYear = Math.round(km / age);
    if (perYear < 3000)
      f("Sehr geringe Laufleistung pro Jahr", `Rechnerisch ca. ${perYear.toLocaleString("de-DE")} km/Jahr. Das kann stimmen (Zweitwagen), Tachomanipulation sollte aber über HU-Berichte und Servicenachweise ausgeschlossen werden.`, "pruefen", "mittel", `${km.toLocaleString("de-DE")} km bei ca. ${age.toFixed(1)} Jahren`);
    else if (perYear > 35000)
      f("Hohe Laufleistung pro Jahr", `Rechnerisch ca. ${perYear.toLocaleString("de-DE")} km/Jahr – oft Langstrecke (für Diesel eher günstig), aber höherer Verschleiß.`, "bestaetigt", "niedrig", `${km.toLocaleString("de-DE")} km bei ca. ${age.toFixed(1)} Jahren`);
  }
  if (v.previousOwners !== null && v.previousOwners >= 4)
    f("Viele Vorbesitzer", `${v.previousOwners} Vorbesitzer – Historie lückenloser prüfen.`, "bestaetigt", "mittel", "Inseratsangabe");
  const hu = parseMonthYear(v.inspectionDue);
  const huExpired = hu !== null && hu.getTime() < now.getTime();
  const huSoon = hu !== null && !huExpired && hu.getTime() - now.getTime() < 90 * 864e5;
  if (huExpired) f("HU/TÜV abgelaufen", "Das Fahrzeug darf ohne gültige HU nur eingeschränkt bewegt werden; mögliche Mängel sind unbekannt.", "bestaetigt", "hoch", `HU bis ${v.inspectionDue}`);
  else if (huSoon) f("HU/TÜV bald fällig", "Kosten und mögliche Mängel der anstehenden HU einplanen.", "bestaetigt", "niedrig", `HU bis ${v.inspectionDue}`);
  else if (hu && !huPlausible(hu, now, age))
    f("HU-Datum ungewöhnlich weit in der Zukunft", "Eine HU gilt bei Gebrauchtwagen höchstens 24 Monate (bei der ersten HU eines Neuwagens 36). Termin im Fahrzeugschein und an der Plakette prüfen – vielleicht nur ein Tippfehler.", "pruefen", "niedrig", `HU bis ${v.inspectionDue}`);
  if (v.accidentStatus === "Unfallschaden") f("Unfallschaden angegeben", "Art und Umfang des Schadens klären, Gutachten verlangen.", "bestaetigt", "hoch", "Inseratsangabe");
  if (v.accidentStatus === "reparierter Unfallschaden") f("Reparierter Unfallschaden", "Reparaturrechnung und ggf. Gutachten verlangen; fachgerechte Instandsetzung prüfen lassen.", "bestaetigt", "mittel", "Inseratsangabe");
  if (v.knownDamage) f("Vom Verkäufer genannte Schäden", v.knownDamage, "bestaetigt", "mittel", "Inseratsangabe");

  const kw = (re: RegExp) => desc.match(re)?.[0];
  let m: string | undefined;
  if ((m = kw(/export|bastler|für händler/)))
    f("Formulierung deutet auf Export-/Bastlerverkauf", "Solche Hinweise werden genutzt, um Gewährleistung auszuschließen, und deuten oft auf technische Probleme hin.", "verdacht", "hoch", `„${m}“ in der Beschreibung`);
  if ((m = kw(/motorschaden|getriebeschaden|springt nicht|ruckelt|kontrollleuchte|motorleuchte|leuchtet/)))
    f("Verkäufer nennt technische Auffälligkeiten", "Ursache unbedingt vor dem Kauf diagnostizieren lassen.", "bestaetigt", "hoch", `„${m}“ in der Beschreibung`);
  if ((m = kw(/re-?import|eu-?fahrzeug|eu-?neuwagen|import/)))
    f("Mögliches Importfahrzeug", "Importe sind nicht per se schlecht. Prüfe Ausstattung, Historie und Servicenachweise aus dem Herkunftsland.", "verdacht", "niedrig", `„${m}“ in der Beschreibung`);
  if ((m = kw(/hagel/))) f("Hagelschaden erwähnt", "Umfang klären; wirkt sich deutlich auf den Wert aus.", "bestaetigt", "mittel", `„${m}“ in der Beschreibung`);
  if ((m = kw(/nachlackiert|lackiert|smart.?repair|kratzer|delle|beule/)))
    f("Lack- oder Karosseriearbeiten erwähnt", "Bei der Besichtigung Lackübergänge und Spaltmaße genau ansehen.", "bestaetigt", "niedrig", `„${m}“ in der Beschreibung`);
  if (v.accidentStatus === "Unfallschaden" && /unfallfrei/.test(desc))
    f("Widerspruch zur Unfallfreiheit", "Beschreibung nennt 'unfallfrei', die Angaben nennen einen Unfallschaden.", "verdacht", "hoch", "Beschreibung vs. Inseratsangabe");
  if (v.sellerType === "gewerblich" && (m = kw(/ohne (garantie|gewährleistung)|gewährleistungsausschluss|keine gewährleistung/)))
    f("Gewerblicher Verkäufer schließt Gewährleistung aus", "Gegenüber Verbrauchern ist ein vollständiger Ausschluss in der Regel unwirksam. Häufig verbunden mit 'Export'-Klauseln – genau nachfragen.", "verdacht", "mittel", `„${m}“ in der Beschreibung`);

  // ---------- Preis ----------
  const validComps = rawComps.filter((c) => c.price >= 500 && c.price <= 500000);
  const comps = validComps.map((c) => c.price).sort((a, b) => a - b);
  const asking = v.priceEur;
  const price: Price = { asking, comps: validComps, marketEstimate: null, fairMin: null, fairMax: null, note: "" };
  const bySource = (s: Comp["source"]) => validComps.filter((c) => c.source === s).length;
  const sourceText = [
    bySource("index") && `${bySource("index")} aus dem Tachoklar-Preisindex`,
    bySource("web") && `${bySource("web")} per Google-Recherche gefunden, Preis im Inserat geprüft`,
    bySource("nutzer") && `${bySource("nutzer")} von dir eingetragen`,
  ].filter(Boolean).join(", ");

  // ---------- Absehbare Kosten ----------
  const dueCosts: CostItem[] = [];
  if (huExpired || huSoon) dueCosts.push({ title: "Hauptuntersuchung (HU/AU)", min: 140, max: 200, reason: huExpired ? "HU abgelaufen" : "HU in weniger als 3 Monaten fällig" });
  for (const w of weakPoints) {
    const re = MAINT[w.id];
    if (re && w.relevantNow && !re.test(text) && w.costMin !== null && w.costMax !== null)
      dueCosts.push({ title: w.title, min: w.costMin, max: w.costMax, reason: "Wartung laut Herstellervorgabe fällig, kein Nachweis im Inserat" });
  }
  const dueMid = dueCosts.reduce((s, c) => s + (c.min + c.max) / 2, 0);

  if (comps.length >= 3) {
    const med = quantile(comps, 0.5);
    price.marketEstimate = r100(med);
    price.fairMin = r100(Math.max(0, quantile(comps, 0.25) - dueMid));
    price.fairMax = r100(Math.max(0, quantile(comps, 0.75) - dueMid));
    price.note = `Geschätzt aus ${comps.length} Vergleichsangeboten (${sourceText}), Median. Fairer Bereich = mittlere 50 % der Vergleichspreise${dueMid ? `, abzüglich absehbarer Kosten (ca. ${eur(r100(dueMid))})` : ""}.`;
    if (asking !== null && asking < quantile(comps, 0.25) * 0.85)
      f("Preis deutlich unter Vergleichsangeboten", "Ein auffällig niedriger Preis kann Gründe haben (Mängel, Eile) – oder auf Betrug hindeuten. Niemals Anzahlungen/Vorkasse ohne Besichtigung leisten.", "verdacht", "mittel", `${eur(asking)} vs. Median ${eur(r100(med))}`);
  } else {
    price.note = `Nicht genug Vergleichsdaten${comps.length ? ` (bisher ${comps.length}: ${sourceText})` : ""}. Der Tachoklar-Preisindex wächst mit jeder Analyse; bis dahin kannst du selbst Vergleichspreise ergänzen (gleiches Modell, ähnliches Baujahr und km). Ohne mindestens 3 Vergleichswerte nennen wir bewusst keinen Marktwert.`;
  }

  // HU/TÜV prüft allein die Regelprüfung oben (mit echtem heutigem Datum) – die KI hat sich dabei schon verrechnet
  if (ai)
    for (const a of ai.listingFindings) if (!isHuTopic(`${a.title} ${a.detail}`)) findings.push({ ...a, provenance: "ki" });
  findings.sort((a, b) => LEVEL_ORDER[a.severity] - LEVEL_ORDER[b.severity]);

  // ---------- Scores ----------
  const breakdown: Scores["breakdown"] = [];
  const suspicious = findings.filter((x) => x.status === "verdacht").length;
  const transparency = clamp(Math.round((10 * (keyFields.length - missing.length)) / keyFields.length - Math.min(3, suspicious)), 1, 10);

  const relevantWps = weakPoints.filter((w) => w.relevantNow);
  let tr = relevantWps.reduce((s, w) => s + W[w.risk] * (w.provenance === "ki" || w.provenance === "recherche" ? 0.5 : 1), 0);
  if (km !== null && km > 200000) tr += 1;
  if (age !== null && age > 12) tr += 1;
  if (!kb.length) tr += 1; // keine modellspezifischen Daten = mehr Unsicherheit
  const techRisk = clamp(Math.round(tr * 0.9), 0, 10); // ~11 Gewichtspunkte = Maximum, damit 10/10 echten Extremfällen vorbehalten bleibt

  let condition: number | null = null;
  if (km !== null || age !== null) {
    let c = 10;
    if (km !== null) c -= km > 200000 ? 3 : km > 150000 ? 2 : km > 100000 ? 1 : 0;
    if (age !== null) c -= age > 12 ? 2 : age > 8 ? 1 : 0;
    if ((v.previousOwners ?? 0) >= 4) c -= 1;
    if (v.accidentStatus === "Unfallschaden") c -= 3;
    if (v.accidentStatus === "reparierter Unfallschaden") c -= 1.5;
    if (huExpired) c -= 1;
    if (v.knownDamage) c -= 1;
    c -= findings.filter((x) => x.provenance === "ki" && x.severity === "hoch" && x.status !== "pruefen").length;
    condition = clamp(Math.round(c), 1, 10);
  }

  let value: number | null = null;
  if (price.marketEstimate && asking !== null) {
    const ratio = (asking + dueMid) / price.marketEstimate;
    value = clamp(Math.round(10 - (ratio - 0.85) * 25), 1, 10);
  }

  const parts = [
    { label: "Technisches Risiko", w: 4, raw: techRisk, note: `${relevantWps.length} relevante Schwachstellen/Verschleißpunkte${kb.length ? "" : ", keine modellspezifischen Daten"}` },
    { label: "Fahrzeugzustand (invertiert)", w: 2.5, raw: condition === null ? 5 : 10 - condition, note: condition === null ? "nicht bewertbar – neutral angesetzt" : `Zustand ${condition}/10` },
    { label: "Inserat-Transparenz (invertiert)", w: 2, raw: 10 - transparency, note: `${missing.length} fehlende Angaben, ${suspicious} Verdachtsmomente` },
    { label: "Preisrisiko", w: 1.5, raw: value === null ? 5 : 10 - value, note: value === null ? "keine Vergleichsdaten – neutral angesetzt" : `Preis-Leistung ${value}/10` },
  ];
  for (const p of parts) breakdown.push({ label: p.label, points: Math.round(p.raw * p.w), note: p.note });
  const overallRisk = clamp(breakdown.reduce((s, b) => s + b.points, 0), 0, 100);
  const scores: Scores = { condition, value, techRisk, transparency, overallRisk, breakdown };
  const identification = identify(v, kb, dataNotes);
  const dataQuality = rateData({ missing, motorKnown: kb.some((e) => e.kind === "motor"), ai: Boolean(ai), market: price.marketEstimate !== null, kmKnown: km !== null, ageKnown: age !== null });

  // ---------- Empfehlung ----------
  const reasons: string[] = [];
  const severe = findings.filter((x) => x.severity === "hoch" && x.status !== "pruefen");
  const highOpen = relevantWps.filter((w) => w.risk === "hoch" && w.provenance !== "ki" && w.provenance !== "recherche");
  let verdict: Recommendation["verdict"];
  if (overallRisk >= 70 || severe.some((x) => /export|technische auffälligkeiten|unfallschaden angegeben/i.test(x.title))) {
    verdict = "Lieber Abstand nehmen";
    severe.forEach((x) => reasons.push(x.title));
    if (overallRisk >= 70) reasons.push(`Sehr hoher Gesamtrisiko-Score (${overallRisk}/100)`);
  } else if (overallRisk >= 45 || transparency <= 4 || highOpen.length || severe.length) {
    verdict = "Nur nach genauer Prüfung";
    highOpen.forEach((w) => reasons.push(`Bekanntes hohes Risiko: ${w.title} (${w.origin})`));
    severe.forEach((x) => reasons.push(x.title));
    if (transparency <= 4) reasons.push("Viele wichtige Angaben fehlen im Inserat");
    if (overallRisk >= 45) reasons.push(`Erhöhter Gesamtrisiko-Score (${overallRisk}/100)`);
  } else if (dueCosts.length || (value !== null && value <= 5)) {
    verdict = "Preisverhandlung empfohlen";
    dueCosts.forEach((c) => reasons.push(`${c.title}: ${eur(c.min)}–${eur(c.max)}`));
    if (value !== null && value <= 5) reasons.push("Preis liegt über dem Niveau der Vergleichsangebote");
  } else if (value === null) {
    verdict = "Nur nach genauer Prüfung";
    reasons.push("Technisch unauffällig, aber der Preis ist ohne Vergleichsdaten nicht bewertbar");
  } else {
    verdict = "Kaufenswert";
    reasons.push("Keine erheblichen Risiken erkannt und Preis im Marktrahmen");
  }
  // Ohne belastbare Daten keine positive Empfehlung, die genauer klingt, als sie ist
  if (dataQuality.level === "gering" && (verdict === "Kaufenswert" || verdict === "Preisverhandlung empfohlen")) {
    verdict = "Nur nach genauer Prüfung";
    reasons.unshift(`Zu wenig Daten für eine verlässliche Einschätzung (${dataQuality.reasons.join(", ")})`);
  }
  if (!kb.length) reasons.push("Hinweis: Für diesen Motor/dieses Getriebe gibt es noch keinen Datenbankeintrag – modellspezifische Schwachstellen sind nur eingeschränkt bewertet.");
  reasons.push("Unabhängig davon: Besichtigung, Probefahrt und idealerweise ein Gebrauchtwagencheck in einer Werkstatt oder bei einer Prüforganisation.");

  // ---------- Verhandlung ----------
  let negotiation: Negotiation = null;
  if (asking !== null && asking > 0) {
    const args: string[] = [];
    dueCosts.forEach((c) => args.push(`${c.title} – ${c.reason} (ca. ${eur(c.min)}–${eur(c.max)})`));
    let risk = 0;
    for (const w of relevantWps) {
      if (w.costMin === null || w.costMax === null || MAINT[w.id] || w.provenance === "ki" || w.provenance === "recherche") continue;
      const mid = (w.costMin + w.costMax) / 2;
      risk += w.risk === "hoch" ? 0.15 * mid : w.risk === "mittel" ? 0.05 * mid : 0;
      if (w.risk === "hoch") args.push(`Bekanntes Risiko „${w.title}“ ohne Nachweis über Instandsetzung (Reparatur ca. ${eur(w.costMin)}–${eur(w.costMax)})`);
    }
    findings.filter((x) => x.status === "bestaetigt" && x.severity !== "niedrig").forEach((x) => args.push(x.title));
    const base = price.marketEstimate && price.marketEstimate < asking ? price.marketEstimate : asking;
    if (price.marketEstimate && price.marketEstimate < asking) args.unshift(`Angebotspreis liegt über dem Median vergleichbarer Angebote (${eur(price.marketEstimate)})`);
    let target = clamp(r100(base - dueMid - risk), asking * 0.75, asking);
    if (target >= asking) {
      target = r100(asking * 0.97);
      args.push("Üblicher Verhandlungsspielraum im Gebrauchtwagenhandel (Erfahrungswert, keine Marktdaten)");
    }
    const entry = Math.max(r100(asking * 0.7), r100(target - (asking - target) * 0.5 - asking * 0.02));
    const ceiling = Math.max(target, price.fairMax ? Math.min(asking, price.fairMax) : r100(asking - dueMid * 0.5));
    const name = [v.make, v.model, v.variant].filter(Boolean).join(" ") || "Fahrzeug";
    const top = args.slice(0, 4).map((a) => `– ${a}`).join("\n");
    const message = `Guten Tag,

vielen Dank für Ihr Inserat zum ${name}. Das Fahrzeug interessiert mich grundsätzlich sehr.

Bei der Durchsicht sind mir einige Punkte aufgefallen, die ich beim Preis berücksichtigen muss:
${top}

Unter Berücksichtigung dieser Punkte könnte ich mir einen Kaufpreis von ${eur(entry)} vorstellen – vorbehaltlich Besichtigung und Probefahrt.

Wäre das für Sie eine Gesprächsgrundlage? Ich freue mich auf Ihre Rückmeldung.

Viele Grüße`;
    negotiation = { entry, target, ceiling, arguments: args, message };
  }

  // ---------- Checkliste ----------
  const kbWps = kb.flatMap((e) => e.weakPoints);
  const auto = v.transmission === "Automatik";
  const sections: [string, string[], string[]][] = [
    ["Unterlagen", [
      "Zulassungsbescheinigung Teil I und II: Name des Verkäufers = Halter?",
      "Fahrgestellnummer (FIN) am Fahrzeug mit den Papieren abgleichen",
      "Serviceheft und Rechnungen: Kilometerstände chronologisch plausibel?",
      "Letzten HU-Bericht ansehen (km-Stand, Mängel)",
      "Anzahl der Schlüssel prüfen",
    ], []],
    ["Motor", [
      "Motor muss kalt sein – Motorhaube anfassen, vorher nicht laufen lassen",
      "Kaltstart: ungewöhnliche Geräusche (Rasseln, Klackern, Pfeifen)?",
      "Rauch beim Start: blau = Öl, weiß/süßlich = Kühlmittel, schwarz = Ruß",
      "Ölstand und Ölzustand; Öldeckel auf hellen Schlamm prüfen",
      "Kühlmittelstand; Motorraum und Boden auf Ölverlust prüfen",
      "Alle Warnleuchten gehen nach dem Start aus?",
    ], kbWps.filter((w) => w.component !== "Getriebe" && w.check).map((w) => w.check!)],
    ["Getriebe", auto
      ? ["Wählhebel P–R–N–D: Einlegen ohne Schlag?", "Schaltvorgänge weich und ohne Verzögerung?", "Rückwärtsgang und Rangieren testen"]
      : ["Kupplung: Schleifpunkt nicht ganz oben?", "Alle Gänge lassen sich leicht einlegen, kein Kratzen", "Rückwärtsgang testen", "Klappern im Leerlauf (Zweimassenschwungrad)?"],
    kbWps.filter((w) => w.component === "Getriebe" && w.check).map((w) => w.check!)],
    ["Karosserie", [
      "Lackunterschiede bei Tageslicht schräg betrachten",
      "Spaltmaße an Türen, Hauben und Kotflügeln gleichmäßig?",
      "Rost: Radläufe, Schweller, Türunterkanten, Unterboden",
      "Scheiben auf Steinschläge und Risse prüfen",
      "Reifen: Profiltiefe, Alter (DOT), gleichmäßiger Abrieb",
    ], []],
    ["Innenraum", [
      "Verschleiß von Lenkrad, Sitz und Pedalen passt zum Kilometerstand?",
      "Elektrik: Fenster, Spiegel, Licht, Infotainment, Kamera/Sensoren",
      "Klimaanlage: wird es spürbar kalt?",
      "Feuchtigkeit oder muffiger Geruch (Teppich, Kofferraummulde)",
    ], isEv ? ["Ladebuchse und Ladekabel prüfen, Ladevorgang testen"] : []],
    ["Fahrwerk & Bremsen", [
      "Bremsscheiben: deutlicher Rand oder Riefen?",
      "Fahrzeug an jeder Ecke herunterdrücken – wippt es nach?",
      "Lenkung ohne Spiel und Geräusche beim Einschlagen im Stand",
    ], []],
  ];
  const checklist: ChecklistSection[] = sections.map(([area, base, specific]) => ({
    area,
    items: [...specific.map((t) => ({ t, s: true })), ...base.map((t) => ({ t, s: false }))].map((x, i) => ({ id: `${area}-${i}`, text: x.t, specific: x.s })),
  }));
  const toClarify = findings.filter((x) => x.status !== "bestaetigt").map((x) => x.title);
  if (toClarify.length) checklist.unshift({ area: "Aus dem Inserat klären", items: toClarify.map((t, i) => ({ id: `klaeren-${i}`, text: t, specific: true })) });
  for (const c of ai?.extraChecks ?? []) {
    const sec = checklist.find((s) => s.area.toLowerCase() === c.area.toLowerCase()) ?? checklist[checklist.length - 1];
    sec.items.unshift({ id: `${sec.area}-ai-${sec.items.length}`, text: `${c.item} (KI-Hinweis)`, specific: true });
  }

  // ---------- Fragen ----------
  const q = [
    ...kbWps.filter((w) => w.question).map((w) => w.question!),
    ...(v.mileageKm === null ? ["Wie hoch ist der aktuelle Kilometerstand, und ist er belegbar (Serviceheft, HU-Berichte)?"] : []),
    ...(v.firstRegistration === null ? ["Wann war die Erstzulassung?"] : []),
    ...(!v.engineCode && identification[0].certainty === "unklar" ? ["Welcher Motor ist genau verbaut? Bitte Foto vom Fahrzeugschein (Feld D.2 und Typschlüssel 2.2) – persönliche Daten dürfen abgedeckt sein."] : []),
    ...(v.transmission === "Automatik" && identification[1].certainty === "unklar" ? ["Welche Automatik ist verbaut (Wandler, Doppelkupplung, CVT), und wann wurde das Getriebeöl gewechselt?"] : []),
    ...(v.serviceHistory === null ? ["Liegt ein vollständiges Serviceheft bzw. liegen Rechnungen vor?"] : []),
    ...(v.accidentStatus === null ? ["Ist das Fahrzeug unfallfrei? Gab es Lack- oder Karosseriearbeiten?"] : []),
    ...(v.previousOwners === null ? ["Wie viele Vorbesitzer hatte das Fahrzeug?"] : []),
    ...(v.inspectionDue === null ? ["Bis wann ist die HU gültig? Gab es Mängel beim letzten Termin?"] : []),
    "Wann wurde der letzte Ölwechsel bzw. die letzte Inspektion durchgeführt?",
    ...(recalls.length ? [`Für dieses Modell gibt es offizielle EU-Rückrufe (z. B. ${recalls[0].case_number}). Wurden alle Rückrufe und Serviceaktionen durchgeführt?`] : []),
    "Gab es größere Reparaturen? Welche und wann?",
    "Sind Ihnen aktuell technische Probleme oder Warnmeldungen bekannt?",
    "Wie lange ist das Fahrzeug bereits in Ihrem Besitz und warum verkaufen Sie es?",
    "Sind alle Schlüssel vorhanden?",
    "Darf ich das Fahrzeug in einer Werkstatt meiner Wahl prüfen lassen?",
    ...(ai?.extraQuestions ?? []),
  ];
  const seen = new Set<string>();
  const questions = q.filter((x) => !seen.has(x.toLowerCase()) && seen.add(x.toLowerCase()));

  // ---------- Probefahrt ----------
  const td = (title: string, base: string[], specific: string[]): GuideSection => ({
    title,
    points: [...specific.map((t) => ({ text: t, specific: true })), ...base.map((t) => ({ text: t, specific: false }))],
  });
  const tdSpec = kbWps.filter((w) => w.testDrive);
  const testDrive: GuideSection[] = [
    td("Kaltstart", [
      "Bestehe darauf, dass der Motor vor deiner Ankunft nicht lief.",
      "Höre die ersten Sekunden genau hin: Rasseln, Klackern oder Pfeifen sind Warnsignale.",
      "Beobachte den Auspuff beim Start auf Rauch.",
    ], tdSpec.filter((w) => w.component === "Motor").map((w) => w.testDrive!)),
    td("Motor & Geräusche", [
      "Gleichmäßiges Hochdrehen ohne Leistungsloch oder Ruckeln?",
      "Pfeifen beim Beschleunigen kann auf Turbolader-Probleme hindeuten.",
      "Temperaturanzeige: erreicht Betriebstemperatur und bleibt stabil?",
    ], tdSpec.filter((w) => w.component === "Abgasanlage").map((w) => w.testDrive!)),
    td("Getriebe", auto
      ? ["Schaltet die Automatik weich, ohne Schläge und Verzögerung?", "Kickdown testen: schaltet sie zügig zurück?", "Im Stop-and-go auf Rucken achten."]
      : ["Kupplung im hohen Gang bei niedriger Drehzahl kräftig belasten: Drehzahl steigt, Auto nicht? Dann rutscht sie.", "Alle Gänge hoch- und runterschalten, auch rückwärts.", "Springt ein Gang heraus?"],
    tdSpec.filter((w) => w.component === "Getriebe").map((w) => w.testDrive!)),
    td("Fahrwerk & Lenkung", [
      "Läuft das Auto auf gerader Strecke geradeaus, ohne zu ziehen?",
      "Über Unebenheiten fahren: Poltern oder Klappern?",
      "Enge Kurven langsam fahren: Knacken deutet auf Antriebswellen hin.",
    ], []),
    td("Bremsen", [
      "Eine kräftige Bremsung (wo erlaubt): Zieht das Auto zur Seite?",
      "Vibrationen im Lenkrad beim Bremsen deuten auf verzogene Scheiben hin.",
      "Quietschen oder Schleifen beim Bremsen?",
    ], []),
    td("Nach der Fahrt", [
      "Motor laufen lassen und nach Undichtigkeiten unter dem Auto schauen.",
      "Sind während der Fahrt Warnleuchten angegangen?",
      "Ggf. Fehlerspeicher mit einem OBD-Gerät auslesen.",
    ], []),
  ];

  // ---------- Fazit ----------
  const pros: string[] = [];
  if (v.previousOwners !== null && v.previousOwners <= 2) pros.push(`Wenige Vorbesitzer (${v.previousOwners})`);
  if (v.accidentStatus === "unfallfrei") pros.push("Als unfallfrei angegeben");
  if (v.serviceHistory) pros.push("Angaben zur Servicehistorie vorhanden");
  if (hu && !huExpired && !huSoon) pros.push(`HU gültig bis ${v.inspectionDue}`);
  if (value !== null && value >= 7) pros.push("Preis attraktiv im Vergleich zu den Vergleichsangeboten");
  const cons = [...severe.map((x) => x.title), ...highOpen.map((w) => `Bekanntes Risiko: ${w.title}`)];
  const dedupe = (a: string[]) => [...new Set(a)];
  const mustCheck = dedupe([
    ...highOpen.map((w) => `${w.title}: ${w.detection}`),
    ...findings.filter((x) => x.status !== "bestaetigt" && x.severity !== "niedrig").map((x) => x.title),
  ]).slice(0, 8);

  return {
    id,
    createdAt: now.toISOString(),
    vehicle: v,
    matchedKnowledge: kb.map((e) => ({ name: e.name, matchNote: e.matchNote, sources: e.sources })),
    weakPoints,
    findings,
    dueCosts,
    price,
    scores,
    recommendation: { verdict, reasons: dedupe(reasons) },
    checklist,
    questions,
    identification,
    dataQuality,
    testDrive,
    negotiation,
    summary: { pros: dedupe([...pros, ...(ai?.pros ?? [])]), cons: dedupe([...cons, ...(ai?.cons ?? [])]), mustCheck },
    alternatives,
    dataNotes,
    recalls,
    community,
    research,
    aiUsed: ai !== null,
    aiNote,
    ai,
  };
}

export { parseYear };

/** Motor und Getriebe zuordnen – mit ehrlicher Angabe, wie sicher das ist. */
export function identify(v: Vehicle, kb: KbEntry[], dataNotes: string[] = []): Identification[] {
  const motors = kb.filter((e) => e.kind === "motor");
  const gears = kb.filter((e) => e.kind === "getriebe");
  const confirm = "Bestätigen über den Fahrzeugschein (Feld D.2 / Typschlüssel 2.2) oder die FIN.";
  let engine: Identification;
  if (v.engineCode) {
    const fromEea = dataNotes.some((n) => n.includes(`Motorcode ${v.engineCode}`));
    engine = { part: "Motor", label: `Motorcode ${v.engineCode}${motors[0] ? ` – ${motors[0].name}` : ""}`, certainty: "angegeben", basis: `${fromEea ? "Aus den EU-Typdaten (eindeutiger Treffer)." : "Steht im Inserat."} ${confirm}` };
  } else if (motors.length === 1) {
    engine = { part: "Motor", label: motors[0].name, certainty: "wahrscheinlich", basis: `${motors[0].matchNote} ${confirm}` };
  } else if (motors.length > 1) {
    engine = { part: "Motor", label: motors.map((e) => e.name).join(" oder "), certainty: "unklar", basis: `Mehrere Motoren passen zu den Angaben. ${confirm}` };
  } else {
    const spec = [v.displacementCcm && `${(v.displacementCcm / 1000).toFixed(1).replace(".", ",")} l`, v.fuel, v.powerKw && `${v.powerKw} kW`].filter(Boolean).join(", ");
    engine = { part: "Motor", label: spec || "nicht angegeben", certainty: "unklar", basis: `Kein passender Eintrag in unserer Datenbank – motortypische Schwachstellen sind nur eingeschränkt bewertet. ${confirm}` };
  }
  let gearbox: Identification;
  if (v.transmissionDetail) gearbox = { part: "Getriebe", label: [v.transmission, v.transmissionDetail, gears[0] && `– ${gears[0].name}`].filter(Boolean).join(" "), certainty: "angegeben", basis: "Steht im Inserat." };
  else if (gears.length === 1) gearbox = { part: "Getriebe", label: gears[0].name, certainty: "wahrscheinlich", basis: gears[0].matchNote };
  else if (v.transmission === "Schaltgetriebe") gearbox = { part: "Getriebe", label: "Schaltgetriebe", certainty: "angegeben", basis: "Steht im Inserat." };
  else if (v.transmission === "Automatik")
    gearbox = { part: "Getriebe", label: "Automatik, Bauart unbekannt", certainty: "unklar", basis: "Wandler, Doppelkupplung oder CVT haben unterschiedliche Schwachstellen – beim Verkäufer erfragen." };
  else gearbox = { part: "Getriebe", label: "nicht angegeben", certainty: "unklar", basis: "Im Inserat fehlt die Getriebeart." };
  return [engine, gearbox];
}

/** Datenbasis bewerten. "gering" = so wenig bekannt, dass eine positive Empfehlung irreführend wäre. */
export function rateData(d: { missing: string[]; motorKnown: boolean; ai: boolean; market: boolean; kmKnown: boolean; ageKnown: boolean }): DataQuality {
  const reasons: string[] = [];
  if (d.missing.length >= 2) reasons.push(`${d.missing.length} wichtige Angaben fehlen`);
  if (!d.kmKnown) reasons.push("Kilometerstand unbekannt");
  if (!d.ageKnown) reasons.push("Erstzulassung unbekannt");
  if (!d.motorKnown) reasons.push("Motor nicht sicher zugeordnet");
  if (!d.ai) reasons.push("ohne KI-Prüfung des Inserats");
  if (!d.market) reasons.push("zu wenig Vergleichspreise");
  const level = d.missing.length >= 4 || (!d.kmKnown && !d.ageKnown) || (!d.motorKnown && !d.ai) ? "gering" : reasons.length ? "mittel" : "gut";
  return { level, reasons };
}
