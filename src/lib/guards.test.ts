import { test } from "node:test";
import assert from "node:assert/strict";
import { safeHref, sniff, validateListingUrl } from "./guards.ts";

test("Nur https-Links der drei Portale sind erlaubt", () => {
  assert.equal(validateListingUrl("https://www.kleinanzeigen.de/s-anzeige/x/123").hostname, "www.kleinanzeigen.de");
  for (const bad of [
    "http://www.kleinanzeigen.de/x",
    "https://kleinanzeigen.de.evil.com/x",
    "https://evilkleinanzeigen.de/x",
    "https://www.autoscout24.de:8443/x",
    "https://user@www.autoscout24.de/x",
    "https://169.254.169.254/latest",
    "kein link",
  ])
    assert.throws(() => validateListingUrl(bad), bad);
});

test("Bildformat wird an den Bytes erkannt", () => {
  assert.equal(sniff(new Uint8Array([0xff, 0xd8, 0xff, 0xe0])), "image/jpeg");
  assert.equal(sniff(new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])), "image/png");
  assert.equal(sniff(new TextEncoder().encode("RIFF\0\0\0\0WEBPVP8 ")), "image/webp");
  assert.equal(sniff(new TextEncoder().encode("<svg onload=alert(1)>")), null);
});

test("Fremde Links nur mit https", () => {
  assert.equal(safeHref("https://ec.europa.eu/x"), "https://ec.europa.eu/x");
  assert.equal(safeHref("javascript:alert(1)"), undefined);
  assert.equal(safeHref(null), undefined);
});
