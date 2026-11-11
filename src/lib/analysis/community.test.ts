import { test } from "node:test";
import assert from "node:assert/strict";
import { aggregateReports, type ReportRow } from "./community.ts";
import type { Vehicle } from "../types.ts";

const v = { make: "BMW", model: "3er", engineCode: "N47" } as Vehicle;
const rep = (who: string, p: Partial<ReportRow> = {}): ReportRow => ({
  canonical_title: "Steuerkette gelängt", component: "Motor", engine_code: "N47", year: 2012, mileage_km: 140000, cost_eur: 2500, reporter_hash: who, ...p,
});

test("Erst ab 3 verschiedenen Meldern sichtbar – Mehrfachmeldungen einer Person zählen einmal", () => {
  assert.equal(aggregateReports([rep("a"), rep("a"), rep("b")], v, 2012).length, 0);
  const out = aggregateReports([rep("a"), rep("b"), rep("c", { canonical_title: "steuerkette  GELÄNGT" })], v, 2012);
  assert.equal(out.length, 1);
  assert.equal(out[0].reporters, 3);
  assert.equal(out[0].risk, "mittel");
});

test("Anderer Motor oder andere Generation wird nicht mitgezählt", () => {
  const rows = [rep("a"), rep("b"), rep("c", { engine_code: "B47" }), rep("d", { year: 2020 })];
  assert.equal(aggregateReports(rows, v, 2012).length, 0);
});

test("Hohes Risiko erst bei vielen Meldern und hohen Kosten", () => {
  const out = aggregateReports(["a", "b", "c", "d", "e"].map((w) => rep(w)), v, 2012);
  assert.equal(out[0].risk, "hoch");
  assert.equal(out[0].medianCost, 2500);
});

test("Gleicher Titel mit unterschiedlichem Bauteil zählt zusammen", () => {
  const out = aggregateReports([rep("a", { component: "Motor" }), rep("b", { component: "Elektrik" }), rep("c", { component: "Elektrik" })], v, 2012);
  assert.equal(out.length, 1);
  assert.equal(out[0].component, "Elektrik");
});
