import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { bodyOf, canonicalUrl, kaQuery, kaSearchUrl, pagePrice, sameKind, trimOf, pageSeller, parseKaSearch, plausibleListings, priceVerdict } from "./market.ts";

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

test("Privat oder Händler aus der Inseratsseite", () => {
  assert.equal(pageSeller('adInfo = { posterType: "PRIVATE" }'), "privat");
  assert.equal(pageSeller("posterType: 'COMMERCIAL', other: { posterType: 'PRIVATE' }"), "gewerblich");
  assert.equal(pageSeller('{"isDealer":true}'), "gewerblich");
  assert.equal(pageSeller('{"isDealer":false}'), "privat");
  assert.equal(pageSeller("nichts"), null);
});

test("Gleiches Inserat = gleicher Link", () => {
  const a = canonicalUrl(new URL("https://www.kleinanzeigen.de/s-anzeige/golf-7-highline/3569965053-216-2917?utm=x"));
  const b = canonicalUrl(new URL("https://www.kleinanzeigen.de/s-anzeige/volkswagen-golf-7/3569965053-216-2917"));
  assert.equal(a, "https://www.kleinanzeigen.de/s-anzeige/3569965053");
  assert.equal(a, b);
  assert.equal(canonicalUrl(new URL("https://www.autoscout24.de/angebote/vw-golf-abc?x=1#y")), "https://www.autoscout24.de/angebote/vw-golf-abc");
});

test("Kleinanzeigen-Suchbegriffe aus Marke, Modell und Motor", () => {
  assert.equal(kaQuery({ make: "BMW", model: "3er", variant: "320d Touring" }), "bmw-320d");
  assert.equal(kaQuery({ make: "Mercedes-Benz", model: "CLS", variant: "CLS 500 7G-Tronic" }), "mercedes-cls-500");
  assert.equal(kaQuery({ make: "Volkswagen", model: "Golf", variant: "Golf VII 2.0 TDI Highline" }), "volkswagen-golf-2.0-tdi");
  assert.equal(kaQuery({ make: "Audi", model: "A5", variant: "A5 Sportback 40 TDI S tronic" }), "audi-a5-tdi");
  assert.equal(kaQuery({ make: "Audi", model: "A5", variant: "A5 Sportback 40 TDI" }, false), "audi-a5");
});

test("Trefferliste einer echten Kleinanzeigen-Suchseite", () => {
  const out = parseKaSearch(readFileSync(new URL("./fixtures/ka-search.html", import.meta.url), "utf8"));
  assert.ok(out.length >= 2);
  assert.deepEqual(
    { price: out[0].priceEur, km: out[0].mileageKm, year: out[0].year },
    { price: 17900, km: 138500, year: 2017 },
  );
  assert.match(out[0].url, /^https:\/\/www\.kleinanzeigen\.de\/s-anzeige\/.+\/3568354934/);
});

test("Kleinanzeigen-Such-URL mit Baujahr- und km-Filter", () => {
  assert.equal(
    kaSearchUrl({ make: "Audi", model: "A5", variant: "A5 Sportback 40 TDI", firstRegistration: "10/2022", mileageKm: 200000 }),
    "https://www.kleinanzeigen.de/s-autos/audi-a5-tdi/k0c216+autos.ez_i:2020%2C2024+autos.km_i:120000%2C280000",
  );
  assert.equal(kaSearchUrl({ make: null, model: null, variant: null, firstRegistration: null, mileageKm: null }), null);
});

test("Karosserie und Ausstattungslinie trennen", () => {
  assert.equal(bodyOf("Mercedes GLC 300 4Matic Coupé AMG Line"), "Coupé");
  assert.equal(bodyOf("BMW 320d Touring"), "Kombi");
  assert.equal(bodyOf("BMW 320d Gran Turismo M Sport"), "Gran Turismo");
  assert.equal(bodyOf("Kia Ceed GT Line"), null);
  assert.equal(trimOf("BMW 320d M Sportpaket"), "M Sport");
  assert.equal(trimOf("Audi A5 Sportback S line"), "S line");
  assert.equal(trimOf("Premium Sportsitze, Design line"), null);
  const offers = ["GLC 220d Coupé", "GLC 220d 4Matic", "GLC 250 AMG Line", "GLC 300 Coupe AMG Line", "GLC 220d", "GLC 200"];
  assert.deepEqual(sameKind(offers, "GLC 220d SUV", (x) => x).list, ["GLC 220d 4Matic", "GLC 250 AMG Line", "GLC 220d", "GLC 200"]);
  assert.deepEqual(sameKind(offers, "GLC Coupé", (x) => x).list, ["GLC 220d Coupé", "GLC 300 Coupe AMG Line"]);
  const m = ["320d M Sport", "320d M-Paket", "320d m sport", "320d M Sportpaket", "320d Advantage"];
  assert.equal(sameKind(m, "320d M Sportpaket", (x) => x).list.length, 4);
  assert.equal(sameKind(m.slice(3), "320d M Sportpaket", (x) => x).list.length, 2);
});
