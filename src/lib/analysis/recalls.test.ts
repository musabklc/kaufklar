import { test } from "node:test";
import assert from "node:assert/strict";
import { matchRecalls, recallBrand, type Recall } from "./recalls.ts";
import type { Vehicle } from "../types.ts";

const r = (case_number: string, name: string, type_approval: string, production_dates: string | null): Recall => ({
  case_number, published: "2026-10-29", brand: "Audi", name, type_approval, production_dates, risk_type: null, danger: null, measures: null, url: null,
});
const v = { make: "Audi", model: "Q5" } as Vehicle;
const rows = [
  r("A", "A5 Cabrio, A5 Sportback, Q5", "B8, 8R, e1*2001/116*0430*", "28.11.2007 - 26.11.2012"),
  r("B", "SQ5", "e1*2007/46*1179*", null),
  r("C", "A4", "e1*2007/46*0512*", "2015 - 2018"),
];

test("Modellname als ganzes Wort, Produktionszeitraum filtert", () => {
  assert.deepEqual(matchRecalls(v, [], rows, 2011).map((x) => x.case_number), ["A"]); // SQ5 ist nicht Q5
  assert.deepEqual(matchRecalls(v, [], rows, 2016).map((x) => x.case_number), []); // 2016 außerhalb 2007–2012
});

test("Typgenehmigung schlägt Modellname", () => {
  const m = matchRecalls(v, ["e1*2007/46*0512"], rows, 2016);
  assert.equal(m[0].case_number, "C");
  assert.equal(m[0].matchedBy, "Typgenehmigung");
});

test("BMW 3er findet auch '3 Series', Marken werden normalisiert", () => {
  const bmw = [{ ...r("D", "3 Series Touring", "", null), brand: "BMW" }];
  assert.equal(matchRecalls({ make: "BMW", model: "3er" } as Vehicle, [], bmw, 2014).length, 1);
  assert.equal(recallBrand("VW"), "volkswagen");
});
