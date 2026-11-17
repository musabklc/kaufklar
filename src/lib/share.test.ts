import { test } from "node:test";
import assert from "node:assert/strict";
import { sharedListingUrl } from "./share.ts";

test("sharedListingUrl findet den Link in url oder im Text", () => {
  assert.equal(sharedListingUrl(["https://www.autoscout24.de/angebote/x-123", null]), "https://www.autoscout24.de/angebote/x-123");
  assert.equal(sharedListingUrl([null, "Schau mal: https://www.kleinanzeigen.de/s-anzeige/bmw/123-216-1. Gefunden via App"]), "https://www.kleinanzeigen.de/s-anzeige/bmw/123-216-1");
  assert.equal(sharedListingUrl(["", "kein Link", null]), null);
  assert.equal(sharedListingUrl(["http://unsicher.de/x"]), null);
});
