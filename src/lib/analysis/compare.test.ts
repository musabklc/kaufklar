import { test } from "node:test";
import assert from "node:assert/strict";
import { compare } from "./compare.ts";
import type { AnalysisResult } from "../types.ts";

const mk = (id: string, risk: number, value: number | null, high = 0) =>
  ({
    id,
    scores: { overallRisk: risk, value },
    weakPoints: Array.from({ length: high }, () => ({ relevantNow: true, risk: "hoch" })),
  }) as unknown as AnalysisResult;

test("geringeres Risiko gewinnt, Begründung nennt Zahlen", () => {
  const out = compare([{ r: mk("a", 60, 6, 1), monthly: 250 }, { r: mk("b", 35, 6), monthly: 260 }]);
  assert.equal(out.ranked[0].r.id, "b");
  assert.ok(out.reasons.some((x) => x.includes("35 statt 60")));
  assert.ok(out.reasons.some((x) => x.includes("schwere Schwachstellen")));
});

test("deutlich höhere Monatskosten können knappen Risikovorteil kippen", () => {
  // a: 40 Risiko, 400 €/Monat → 40 + 30 = 70; b: 45 Risiko, 250 €/Monat → 45
  const out = compare([{ r: mk("a", 40, null), monthly: 400 }, { r: mk("b", 45, null), monthly: 250 }]);
  assert.equal(out.ranked[0].r.id, "b");
  assert.ok(out.reasons[0].includes("150 €"));
});
