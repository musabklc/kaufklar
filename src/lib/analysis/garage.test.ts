import { test } from "node:test";
import assert from "node:assert/strict";
import { dueReminders, parseDue } from "./garage.ts";

test("parseDue versteht Fahrzeugschein-Format und Datum", () => {
  assert.equal(parseDue("05/2027"), "2027-05-31");
  assert.equal(parseDue("2/2028"), "2028-02-29");
  assert.equal(parseDue("12.03.2027"), "2027-03-12");
  assert.equal(parseDue("2027-03-12"), "2027-03-12");
  assert.equal(parseDue("13/2027"), null);
  assert.equal(parseDue(""), null);
});

test("dueReminders: nur bald fällige, je Termin nur einmal", () => {
  const today = new Date(2026, 10, 17);
  const car = { hu_due: "2026-11-30", service_due: "2027-06-01", belt_due: "2026-10-01", reminded: {} };
  const r = dueReminders(car, today);
  assert.deepEqual(r.map((x) => x.key), ["hu", "belt"]);
  assert.equal(r[1].overdue, true);
  assert.equal(dueReminders({ ...car, reminded: { hu: "2026-11-30", belt: "2026-10-01" } }, today).length, 0);
  // neuer HU-Termin nach der Prüfung → später wieder erinnern
  assert.equal(dueReminders({ ...car, hu_due: "2028-11-30", reminded: { hu: "2026-11-30", belt: "2026-10-01" } }, today).length, 0);
});
