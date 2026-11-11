import { test } from "node:test";
import assert from "node:assert/strict";
import { buildAnalysis } from "./engine.ts";
import { matchKnowledge } from "./knowledge.ts";
import type { Vehicle } from "../types.ts";

const base: Vehicle = {
  make: "BMW", model: "3er", variant: "320d Touring", firstRegistration: "03/2012", mileageKm: 160000,
  powerKw: 135, displacementCcm: 1995, co2GPerKm: 120, consumptionPer100km: 4.6, engineCode: null, fuel: "Diesel", transmission: "Automatik",
  transmissionDetail: null, priceEur: 9900, sellerType: "privat", location: "Augsburg", previousOwners: 2,
  accidentStatus: "unfallfrei", knownDamage: null, inspectionDue: "05/2027", serviceHistory: "Scheckheft gepflegt",
  equipment: [], description: "Gepflegtes Fahrzeug.", listingUrl: null,
};
const now = new Date("2026-11-11");
const run = (v: Partial<Vehicle>, comps: number[] = []) =>
  buildAnalysis({ id: "t", vehicle: { ...base, ...v }, comps: comps.map((price) => ({ price, source: "nutzer" as const })), ai: null, aiNote: null, now });

test("BMW 320d 2012 → N47 + ZF 8HP, Steuerkette hoch relevant", () => {
  const names = matchKnowledge(base).map((e) => e.name);
  assert.ok(names.some((n) => n.includes("N47")));
  assert.ok(names.some((n) => n.includes("8HP")));
  assert.ok(!names.some((n) => n.includes("B47")));
  const r = run({});
  assert.equal(r.weakPoints[0].risk, "hoch");
  assert.equal(r.recommendation.verdict, "Nur nach genauer Prüfung");
  // Getriebeöl ohne Nachweis → absehbare Kosten
  assert.ok(r.dueCosts.some((c) => c.title.includes("Getriebeöl")));
});

test("Ohne Hubraum keine falsche Zuordnung für 530d", () => {
  assert.equal(matchKnowledge({ ...base, displacementCcm: null, variant: "530d" }).filter((e) => e.kind === "motor").length, 0);
});

test("Kein Marktwert ohne mindestens 3 Vergleichspreise", () => {
  const r = run({}, [10000, 11000]);
  assert.equal(r.price.marketEstimate, null);
  assert.equal(r.scores.value, null);
  const r2 = run({}, [10000, 11000, 12000]);
  assert.equal(r2.price.marketEstimate, 11000);
  assert.ok(r2.scores.value !== null);
});

test("Fehlende Daten werden nicht erfunden und senken die Transparenz", () => {
  const r = run({ accidentStatus: null, serviceHistory: null, previousOwners: null, inspectionDue: null });
  assert.ok(r.scores.transparency <= 6);
  assert.ok(r.findings.some((f) => f.title.startsWith("Fehlende Angaben")));
  assert.ok(r.questions.some((q) => q.includes("unfallfrei")));
});

test("Export-Hinweis → Lieber Abstand nehmen", () => {
  const r = run({ description: "Verkauf nur an Export oder Bastler" });
  assert.equal(r.recommendation.verdict, "Lieber Abstand nehmen");
});

test("Verhandlung: Einstieg < Ziel ≤ Obergrenze ≤ Angebot", () => {
  const r = run({ inspectionDue: "01/2026" });
  const n = r.negotiation!;
  assert.ok(n.entry < n.target && n.target <= n.ceiling && n.ceiling <= 9900, JSON.stringify(n));
  assert.ok(n.message.includes("Hauptuntersuchung"));
});

test("Risiko-Score liegt in 0–100 und Breakdown summiert", () => {
  const r = run({});
  assert.ok(r.scores.overallRisk >= 0 && r.scores.overallRisk <= 100);
  assert.equal(r.scores.overallRisk, Math.min(100, r.scores.breakdown.reduce((s, b) => s + b.points, 0)));
});

test("Community-Meldungen erscheinen als eigene Quelle, Dopplungen zur Datenbank nicht", () => {
  const issue = (title: string) => ({ title, component: "Motor", reporters: 4, typicalFromKm: 120000, medianCost: 900, costMin: 700, costMax: 1200, risk: "mittel" as const });
  const r = buildAnalysis({ id: "t", vehicle: base, comps: [], ai: null, aiNote: null, now, community: [issue("Hochdruckpumpe defekt"), issue("Steuerkette gelängt")] });
  const fromUsers = r.weakPoints.filter((w) => w.provenance === "nutzer");
  assert.deepEqual(fromUsers.map((w) => w.title), ["Hochdruckpumpe defekt"]); // Steuerkette steht schon in der Datenbank
  assert.match(fromUsers[0].origin, /4 Meldungen/);
});

test("Im Inserat erledigte Reparatur zählt nicht mehr als akutes Risiko", () => {
  const offen = run({});
  const erledigt = run({ description: "Steuerkette wurde 2021 bei 140.000 km komplett neu gemacht, Rechnung liegt vor." });
  const kette = (r: ReturnType<typeof run>) => r.weakPoints.find((w) => w.id === "n47-kette")!;
  assert.equal(kette(offen).relevantNow, true);
  assert.equal(kette(erledigt).relevantNow, false);
  assert.match(kette(erledigt).origin, /erledigt/);
  assert.ok(erledigt.scores.overallRisk < offen.scores.overallRisk);
  assert.ok(!erledigt.recommendation.reasons.some((x) => x.includes("Steuerkette")));
});

test("Erwähnung ohne Reparatur zählt nicht als erledigt", () => {
  const r = run({ description: "Steuerkette macht beim Kaltstart kurz Geräusche." });
  assert.equal(r.weakPoints.find((w) => w.id === "n47-kette")!.relevantNow, true);
});
