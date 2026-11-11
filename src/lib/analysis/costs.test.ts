import { test } from "node:test";
import assert from "node:assert/strict";
import { kfzSteuer, monthlyCosts, defaultCostInputs } from "./costs.ts";
import type { Vehicle } from "../types.ts";

const v = (p: Partial<Vehicle>): Vehicle => ({
  make: "VW", model: "Golf", variant: null, firstRegistration: null, mileageKm: null, powerKw: null, displacementCcm: null,
  co2GPerKm: null, consumptionPer100km: null, engineCode: null, fuel: "Benzin", transmission: null, transmissionDetail: null,
  priceEur: null, sellerType: null, location: null, previousOwners: null, accidentStatus: null, knownDamage: null,
  inspectionDue: null, serviceHistory: null, equipment: [], description: null, listingUrl: null, ...p,
});

test("Kfz-Steuer ab 2021 progressiv: Golf 1.5 TSI, 1498 cm³, 120 g → 81 €", () => {
  // 15 × 2 € + 20 g × 2,00 + 5 g × 2,20 = 30 + 40 + 11
  assert.equal(kfzSteuer(v({ displacementCcm: 1498, co2GPerKm: 120 }), new Date(2021, 5, 1)).amount, 81);
});

test("Kfz-Steuer 2012/2013: 320d, 1995 cm³, 120 g → 210 €", () => {
  // 20 × 9,50 € + (120 − 110) × 2 €
  assert.equal(kfzSteuer(v({ fuel: "Diesel", displacementCcm: 1995, co2GPerKm: 120 }), new Date(2012, 2, 1)).amount, 210);
});

test("Kfz-Steuer 2014–2020: Freibetrag 95 g", () => {
  assert.equal(kfzSteuer(v({ displacementCcm: 1395, co2GPerKm: 95 }), new Date(2016, 0, 1)).amount, 28);
});

test("Ohne CO2 keine erfundene Steuer, E-Auto steuerfrei", () => {
  assert.equal(kfzSteuer(v({ displacementCcm: 1498 }), new Date(2021, 0, 1)).amount, null);
  assert.equal(kfzSteuer(v({ fuel: "Elektro" }), new Date(2022, 0, 1)).amount, 0);
});

test("Monatskosten summieren nur bekannte Posten und melden Unvollständigkeit", () => {
  const veh = v({ displacementCcm: 1498, co2GPerKm: 120, consumptionPer100km: 5 });
  const m = monthlyCosts(veh, new Date(2021, 5, 1), { ...defaultCostInputs(veh, 5), fuelPrice: 1.8 }, []);
  // Steuer 81/12≈7, Sprit 5/100×12000×1,8/12=90, Wartung 700/12≈58
  assert.equal(m.total, 7 + 90 + 58);
  assert.equal(m.complete, false); // Versicherung fehlt
});
