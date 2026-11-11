import { test } from "node:test";
import assert from "node:assert/strict";
import { z } from "zod";
import { parseLenient, toGeminiSchema } from "./schema.ts";

const S = z.object({ fuel: z.enum(["Benzin", "Diesel"]).nullable(), km: z.number().nullable(), tags: z.array(z.string()) });

test("nullable enum wird zu nullbarem String mit Werteliste", () => {
  const js = toGeminiSchema(S) as { properties: Record<string, Record<string, unknown>> };
  assert.deepEqual(js.properties.fuel.type, ["string", "null"]);
  assert.equal(js.properties.fuel.enum, undefined);
  assert.match(String(js.properties.fuel.description), /Benzin \| Diesel/);
  assert.deepEqual(js.properties.km.type, ["number", "null"]);
});

test("ungültiger Enum-Wert wird null statt geraten", () => {
  assert.deepEqual(parseLenient(S, { fuel: "Elektro", km: 5, tags: [] }), { fuel: null, km: 5, tags: [] });
  assert.equal(parseLenient(S, { fuel: "Diesel", km: "viel", tags: [] }), null);
});
