import { test } from "node:test";
import assert from "node:assert/strict";
import { watchEvent } from "./watch.ts";

test("watchEvent: weg, gesenkt, sonst nichts", () => {
  assert.deepEqual(watchEvent(10000, { gone: true, price: null }), { kind: "weg" });
  assert.deepEqual(watchEvent(10000, { gone: false, price: 9500 }), { kind: "gesenkt", from: 10000, to: 9500 });
  assert.equal(watchEvent(10000, { gone: false, price: 9990 }), null); // Kleinstbetrag
  assert.equal(watchEvent(10000, { gone: false, price: 10500 }), null); // gestiegen
  assert.equal(watchEvent(null, { gone: false, price: 9000 }), null); // nichts zum Vergleichen
  assert.equal(watchEvent(10000, { gone: false, price: null }), null); // Preis nicht lesbar
});
