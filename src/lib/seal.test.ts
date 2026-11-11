import { test } from "node:test";
import assert from "node:assert/strict";
import { sealVehicle, verifySeal } from "./seal.ts";
import type { Vehicle } from "./types.ts";

const v = { make: "VW", model: "Golf", firstRegistration: "2016", mileageKm: 140000, powerKw: 110, fuel: "Diesel", priceEur: 13490, listingUrl: null } as Vehicle;

test("Gültiges Siegel passt, geänderter Preis oder fremder Schlüssel nicht", () => {
  const seal = sealVehicle(v, "geheim");
  assert.equal(verifySeal(v, seal, "geheim"), true);
  assert.equal(verifySeal({ ...v, priceEur: 9990 }, seal, "geheim"), false);
  assert.equal(verifySeal(v, seal, "anderer-schluessel"), false);
  assert.equal(verifySeal(v, "kaputt", "geheim"), false);
  assert.equal(verifySeal(v, null, "geheim"), false);
});
