import { test } from "node:test";
import assert from "node:assert/strict";
import { eeaMake, fillFromEea, summarizeEea, type EeaRow } from "./eea-match.ts";
import { matchKnowledge } from "./knowledge.ts";
import type { Vehicle } from "../types.ts";

const v: Vehicle = {
  make: "BMW", model: "3er", variant: "320d Touring", firstRegistration: "03/2014", mileageKm: 160000, powerKw: 135, displacementCcm: 1995,
  co2GPerKm: null, consumptionPer100km: null, engineCode: null, fuel: "Diesel", transmission: "Automatik", transmissionDetail: null, priceEur: 9900,
  sellerType: null, location: null, previousOwners: null, accidentStatus: null, knownDamage: null, inspectionDue: null, serviceHistory: null,
  equipment: [], description: null, listingUrl: null,
};
const row = (Cn: string, Ft: string, co2: number, TAN = "e1*2007/46*0512*04"): EeaRow => ({
  Cn, Ft, TAN, "Ec (cm3)": 1995, "Ep (KW)": 135, "M (kg)": 1600, "E (g/km)": co2, "Enedc (g/km)": null, "Ewltp (g/km)": null, Fc: null, Year: 2014,
});

test("Marke wird normalisiert und gegen SQL-Injection geprüft", () => {
  assert.equal(eeaMake("VW"), "VOLKSWAGEN");
  assert.equal(eeaMake("Škoda"), "SKODA");
  assert.equal(eeaMake("BMW' OR 1=1--"), null);
});

test("Nur passender Kraftstoff und Modellname zählen, Motorcode wird erkannt", () => {
  const s = summarizeEea(v, [row("320D TOURING F31 N47", "Diesel", 119), row("320D", "DIESEL", 121), row("120D", "Diesel", 300), row("320I", "Petrol", 150)])!;
  assert.equal(s.matches, 2);
  assert.equal(s.co2, 121);
  assert.deepEqual(s.engineCodes, ["N47"]);
  assert.deepEqual(s.typeApprovals, ["e1*2007/46*0512"]);
});

test("Ergänzt nur leere Felder, Inseratsangaben bleiben", () => {
  const s = summarizeEea(v, [row("320D N47", "Diesel", 119)])!;
  const { vehicle, filled } = fillFromEea({ ...v, co2GPerKm: 130 }, s);
  assert.equal(vehicle.co2GPerKm, 130);
  assert.equal(vehicle.engineCode, "N47");
  assert.ok(filled.some((f) => f.includes("N47")));
});

test("Motorcode entscheidet zwischen N47 und B47 im Übergangsjahr", () => {
  const names = (code: string | null) => matchKnowledge({ ...v, engineCode: code }).filter((e) => e.kind === "motor").map((e) => e.id);
  assert.deepEqual(names(null), ["bmw-n47", "bmw-b47"]);
  assert.deepEqual(names("B47"), ["bmw-b47"]);
});

test("Modellname trennt Modelle mit gleichem Motor", () => {
  const golf = { ...v, make: "VW", model: "Golf", variant: "1.5 TSI", fuel: "Benzin" as const };
  const s = summarizeEea(golf, [row("GOLF", "PETROL", 130), row("GOLF VARIANT", "PETROL", 132), row("TIGUAN", "PETROL", 160), row("PASSAT", "PETROL", 150)])!;
  assert.equal(s.matches, 2);
  assert.equal(s.co2, 132);
});

test("Ohne erkanntes Modell keine Typgenehmigungen (verhindert falsche Rückrufe)", () => {
  const s = summarizeEea({ ...v, model: "Tiguan", variant: null }, [row("PASSAT", "Diesel", 130, "e1*2001/116*0307*20")])!;
  assert.deepEqual(s.typeApprovals, []);
});
