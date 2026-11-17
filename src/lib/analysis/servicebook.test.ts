import { test } from "node:test";
import assert from "node:assert/strict";
import { checkServiceBook } from "./servicebook.ts";

const now = new Date(2026, 10, 17);
const e = (date: string, km: number | null, work = "Inspektion") => ({ date, km, work, workshop: null });

test("stimmiges Heft: alles grün, Zahnriemen erkannt", () => {
  const r = checkServiceBook([e("03/2022", 60000), e("04/2023", 78000, "Zahnriemen + Inspektion"), e("05/2024", 95000), e("06/2025", 112000)], 120000, now);
  assert.equal(r[0].level, "ok");
  assert.ok(r.some((c) => c.text.includes("Zahnriemen")));
  assert.ok(!r.some((c) => c.level !== "ok"));
});

test("sinkende Kilometer und Inserat mit weniger km als Heft: rot", () => {
  const r = checkServiceBook([e("03/2022", 120000), e("04/2023", 90000)], 95000, now);
  assert.ok(r.some((c) => c.level === "bad" && c.text.includes("sinken")));
  assert.ok(r.some((c) => c.level === "bad" && c.text.includes("Inserat")));
});

test("Lücken und alter letzter Eintrag: gelb", () => {
  const r = checkServiceBook([e("01/2018", 40000), e("06/2021", 70000)], 90000, now);
  assert.ok(r.some((c) => c.level === "warn" && c.text.includes("Lücke")));
  assert.ok(r.some((c) => c.level === "warn" && c.text.includes("Jahre her")));
});

test("nichts lesbar", () => {
  assert.equal(checkServiceBook([e("irgendwann", 1000)], null, now)[0].level, "warn");
});
