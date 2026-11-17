import { test } from "node:test";
import assert from "node:assert/strict";
import { likePattern, searchTerms, snippet } from "./forum.ts";

test("searchTerms: klein, ohne Sonderzeichen, ohne Dubletten, max. 5", () => {
  assert.deepEqual(searchTerms("  BMW 320d  Getriebe, bmw!! "), ["bmw", "320d", "getriebe"]);
  assert.deepEqual(searchTerms("a b"), []);
  assert.equal(searchTerms("eins zwei drei vier fünf sechs").length, 5);
  assert.deepEqual(searchTerms("W204 (C-Klasse)"), ["w204", "c-klasse"]);
});

test("likePattern maskiert ILIKE-Platzhalter", () => {
  assert.equal(likePattern("50%"), "%50\\%%");
  assert.equal(likePattern("a_b"), "%a\\_b%");
});

test("snippet zeigt die Fundstelle", () => {
  const text = "x".repeat(200) + " Getriebeschaden bei 180.000 km " + "y".repeat(200);
  const s = snippet(text, ["getriebe"]);
  assert.ok(s.startsWith("… "));
  assert.ok(s.includes("Getriebeschaden"));
  assert.equal(snippet("kurz", ["nix"]), "kurz");
});
