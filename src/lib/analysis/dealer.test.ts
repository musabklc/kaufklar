import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { parseKaDealer, rateDealer } from "./dealer.ts";

const html = readFileSync(new URL("./fixtures/ka-dealer.html", import.meta.url), "utf8");

test("Händler-Check: Kleinanzeigen-Händler wird ausgelesen und als solide eingestuft", () => {
  const d = parseKaDealer(html)!;
  assert.equal(d.name, "Muster Autohaus GmbH");
  assert.equal(d.city, "Musterstadt");
  assert.equal(d.since, "30.12.2015");
  assert.equal(d.adsOnline, 252);
  assert.equal(d.register, "HRB 1234, Amtsgericht Musterstadt");
  assert.equal(d.vatId, true);
  assert.equal(d.profileUrl, "https://www.kleinanzeigen.de/s-bestandsliste.html?userId=12345678");
  const r = rateDealer(d, new Date("2026-11-18"));
  assert.equal(r.verdict, "solide");
  assert.ok(r.points.every((p) => p.ok));
  assert.ok(r.reviewsUrl.includes("Muster%20Autohaus%20GmbH%20Musterstadt"));
});

test("Händler-Check: neues Konto ohne Impressum = Vorsicht, Privatverkäufer = kein Check", () => {
  const bare = html.replace("30.12.2015", "01.11.2026").replace("252 Anzeigen", "1 Anzeige").replace(/<p id="viewad-imprint-text">[\s\S]*?<\/p>/, "");
  const r = rateDealer(parseKaDealer(bare)!, new Date("2026-11-18"));
  assert.equal(r.verdict, "vorsicht");
  assert.equal(r.points.filter((p) => !p.ok).length, 3);
  assert.equal(parseKaDealer(html.replace("Gewerblicher Nutzer", "Privater Nutzer")), null);
  assert.equal(parseKaDealer("<html>kein Verkäuferkasten</html>"), null);
});
