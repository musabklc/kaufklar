import { test } from "node:test";
import assert from "node:assert/strict";
import { buildAnalysis } from "./engine.ts";
import { FREE_WEAKPOINTS, freeView } from "./premium.ts";
import type { Vehicle } from "../types.ts";

const v: Vehicle = {
  make: "BMW", model: "3er", variant: "320d Touring", firstRegistration: "03/2012", mileageKm: 160000,
  powerKw: 135, displacementCcm: 1995, co2GPerKm: 120, consumptionPer100km: 4.6, engineCode: null, fuel: "Diesel", transmission: "Automatik",
  transmissionDetail: null, priceEur: 9900, sellerType: "privat", location: "Augsburg", previousOwners: 2,
  accidentStatus: "unfallfrei", knownDamage: null, inspectionDue: "05/2027", serviceHistory: "Scheckheft gepflegt",
  equipment: [], description: "Gepflegtes Fahrzeug.", listingUrl: null,
};

test("Kostenlose Fassung enthält nichts Kostenpflichtiges", () => {
  const full = buildAnalysis({ id: "t", vehicle: v, comps: [9000, 10000, 11000].map((price) => ({ price, source: "web" as const, url: "https://www.kleinanzeigen.de/s-anzeige/x" })), ai: null, aiNote: null, now: new Date("2026-11-11") });
  assert.ok(full.weakPoints.length > FREE_WEAKPOINTS && full.questions.length && full.checklist.length && full.negotiation);
  const free = freeView(full);
  assert.equal(free.locked?.weakPoints, full.weakPoints.length - FREE_WEAKPOINTS);
  assert.ok(free.weakPoints.every((w) => w.costMin === null && w.costMax === null && w.detection === ""));
  assert.deepEqual([free.price.comps, free.price.marketEstimate, free.price.fairMin, free.ai, free.negotiation], [[], null, null, null, null]);
  assert.deepEqual([free.questions, free.checklist, free.testDrive, free.dueCosts, free.alternatives, free.community], [[], [], [], [], [], []]);
  assert.ok(!JSON.stringify(free).includes("kleinanzeigen.de/s-anzeige"));
  assert.ok(free.recommendation.reasons.every((x) => !x.includes("€")));
  // Ersteinschätzung bleibt
  assert.equal(free.recommendation.verdict, full.recommendation.verdict);
  assert.deepEqual(free.scores, full.scores);
});
