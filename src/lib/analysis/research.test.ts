import { test } from "node:test";
import assert from "node:assert/strict";
import { researchKey } from "./research.ts";
import type { Vehicle } from "../types.ts";

const v = (o: Partial<Vehicle>): Vehicle => ({
  make: "BMW", model: "3er", variant: "320d Touring", firstRegistration: "03/2013", mileageKm: 160000,
  powerKw: 135, displacementCcm: 1995, co2GPerKm: null, consumptionPer100km: null, engineCode: null, fuel: "Diesel", transmission: "Automatik",
  transmissionDetail: null, priceEur: 9900, sellerType: null, location: null, previousOwners: null,
  accidentStatus: null, knownDamage: null, inspectionDue: null, serviceHistory: null, equipment: [], description: null, listingUrl: null, ...o,
});

test("Recherche-Schlüssel: gleicher Typ trifft denselben Eintrag", () => {
  const a = researchKey(v({}))!;
  assert.equal(a.key, "bmw|3er|diesel|2.0l|2013-2015");
  // andere Ausstattung, Leistung, Baujahr im selben Block → gleicher Eintrag
  assert.equal(researchKey(v({ variant: "318d Limousine", powerKw: 105, displacementCcm: 1995, firstRegistration: "2015" }))!.key, a.key);
  // VW = Volkswagen, Mercedes = Mercedes-Benz
  assert.equal(researchKey(v({ make: "VW", model: "Golf", displacementCcm: 1968 }))!.key, researchKey(v({ make: "Volkswagen", model: "Golf", displacementCcm: 1968 }))!.key);
  assert.equal(researchKey(v({ make: "Mercedes", model: "C 220" }))!.key.split("|")[0], "mercedes-benz");
  // anderer Motor oder Baujahr-Block → eigener Eintrag
  assert.notEqual(researchKey(v({ fuel: "Benzin" }))!.key, a.key);
  assert.notEqual(researchKey(v({ firstRegistration: "2016" }))!.key, a.key);
  assert.equal(researchKey(v({ engineCode: "B47" }))!.key, "bmw|3er|diesel|b47|2013-2015");
});

test("Recherche-Schlüssel: ohne Motor oder Baujahr keine Recherche", () => {
  assert.equal(researchKey(v({ displacementCcm: null })), null);
  assert.equal(researchKey(v({ firstRegistration: null })), null);
  assert.equal(researchKey(v({ fuel: null })), null);
});

test("Vorbefüll-Liste: jeder Eintrag ergibt einen eigenen Recherche-Schlüssel", async () => {
  const { SEED_TYPES } = await import("./seed-types.ts");
  const keys = SEED_TYPES.map((t) => researchKey(t)?.key);
  assert.ok(SEED_TYPES.length >= 150, `nur ${SEED_TYPES.length}`);
  assert.ok(keys.every(Boolean), "Eintrag ohne Schlüssel");
  const dup = keys.filter((k, i) => keys.indexOf(k) !== i);
  assert.deepEqual(dup, []);
});
