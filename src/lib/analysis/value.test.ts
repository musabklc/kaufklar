import { test } from "node:test";
import assert from "node:assert/strict";
import { valuation } from "./value.ts";

test("valuation: Median, Spanne, Privat- und Händlerpreis; Ausreißer raus", () => {
  const v = valuation([9000, 9500, 10000, 10500, 11000, 45000])!;
  assert.equal(v.count, 5); // 45.000 ist ein Ausreißer
  assert.equal(v.median, 10000);
  assert.deepEqual(v.privateSale, [9000, 9700]);
  assert.deepEqual(v.dealer, [7200, 8500]);
  assert.equal(valuation([9000, 10000]), null); // zu wenig Vergleich
});
