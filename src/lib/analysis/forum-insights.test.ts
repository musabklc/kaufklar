import { test } from "node:test";
import assert from "node:assert/strict";
import { aggregateInsights, sameMake, sameModel, type InsightRow } from "./forum-insights.ts";
import type { Vehicle } from "../types.ts";

const v = (p: Partial<Vehicle>) => ({ make: "BMW", model: "3er", engineCode: null, ...p }) as Vehicle;
const row = (p: Partial<InsightRow>): InsightRow => ({
  post_id: 1, thread_id: 1, author_id: "a", make: "BMW", model: "3er", engine_code: null, year: null,
  kind: "schwachstelle", title: "Steuerkette gelängt", component: "Motor", mileage_km: null, cost_eur: null, ...p,
});

test("sameModel: Schreibweisen ja, andere Baureihe nein", () => {
  assert.ok(sameModel("CLS", "CLS-Klasse"));
  assert.ok(sameModel("3er", "3er Touring"));
  assert.ok(sameModel("Golf", "Golf VII"));
  assert.ok(!sameModel("A4", "A40"));
  assert.ok(!sameModel("Golf", "Polo"));
  assert.ok(sameMake("Mercedes-Benz", "Mercedes"));
  assert.ok(sameMake("VW", "Volkswagen"));
});

test("aggregateInsights fasst gleiche Erfahrungen zusammen und zählt Personen", () => {
  const rows = [
    row({ post_id: 1, author_id: "a", mileage_km: 150000, cost_eur: 2000 }),
    row({ post_id: 2, author_id: "b", title: "Steuerkette  Gelängt", mileage_km: 170000, cost_eur: 2600 }),
    row({ post_id: 3, author_id: "b", mileage_km: 170000 }),
    row({ post_id: 4, author_id: "c", kind: "pluspunkt", title: "Getriebe problemlos", component: "Getriebe" }),
    row({ post_id: 5, author_id: "d", model: "5er" }),
  ];
  const out = aggregateInsights(rows, v({}), 2015);
  assert.equal(out.length, 2);
  assert.equal(out[0].kind, "schwachstelle");
  assert.equal(out[0].people, 2);
  assert.equal(out[0].posts.length, 3);
  assert.equal(out[0].typicalKm, 170000);
  assert.equal(out[0].medianCost, 2000);
  assert.equal(out[1].kind, "pluspunkt");
});

test("aggregateInsights: anderer Motorcode oder ferne Generation zählt nicht", () => {
  const rows = [row({ engine_code: "N47" }), row({ post_id: 2, year: 2003 })];
  assert.equal(aggregateInsights(rows, v({ engineCode: "B47" }), 2017).length, 0);
  assert.equal(aggregateInsights(rows, v({}), null).length, 1);
});
