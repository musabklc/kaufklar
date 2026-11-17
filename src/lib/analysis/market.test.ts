import { test } from "node:test";
import assert from "node:assert/strict";
import { pagePrice, plausibleListings, priceVerdict } from "./market.ts";

const l = (priceEur: number, year: number | null, mileageKm: number | null, url = "https://www.mobile.de/x") => ({ title: "CLS 500", priceEur, year, mileageKm, url });

test("Nur vergleichbare Angebote, Dubletten raus, Links nur zu Portalen", () => {
  const out = plausibleListings(
    [l(9000, 2008, 160000), l(9000, 2008, 160000), l(12990, 2009, 15000), l(14000, 2003, 170000), l(300, 2008, 160000), l(11000, null, null, "https://evil.example/x")],
    { firstRegistration: "06/2008", mileageKm: 168000 },
  );
  assert.deepEqual(out.map((x) => x.priceEur), [9000, 11000]);
  assert.equal(out[1].url, "");
});

test("Preisurteil gegen den Marktschnitt", () => {
  assert.equal(priceVerdict(10000, 10000)?.label, "Gut eingepreist");
  assert.equal(priceVerdict(11000, 10000)?.label, "Etwas teuer");
  assert.equal(priceVerdict(13000, 10000)?.label, "Zu teuer");
  assert.equal(priceVerdict(7000, 10000)?.label, "Auffällig günstig");
  assert.equal(priceVerdict(null, 10000), null);
});

test("Preis aus der Inseratsseite lesen", () => {
  assert.equal(pagePrice('<meta itemprop="price" content="8500.00"/>'), 8500);
  assert.equal(pagePrice('{"@type":"Offer","price": 12990,"priceCurrency":"EUR"}'), 12990);
  assert.equal(pagePrice('{"price":"0"}'), null);
  assert.equal(pagePrice("kein Preis"), null);
});
