import { test } from "node:test";
import assert from "node:assert/strict";
import { parseCarRecalls, parseWeeklyList } from "./safety-gate.ts";

test("Wochenliste und Pkw-Rückrufe werden gelesen, andere Produkte ignoriert", () => {
  const list = `<weeklyReport><year>2026</year><URL>https://ec.europa.eu/x?id=1&amp;language=en</URL></weeklyReport>`;
  assert.deepEqual(parseWeeklyList(list), [{ year: 2026, url: "https://ec.europa.eu/x?id=1&language=en" }]);

  const report = `
    <notifications><caseNumber>SR/1</caseNumber><publicationDate>29-10-2026</publicationDate><category><![CDATA[Motor vehicles]]></category>
      <product><![CDATA[Passenger car]]></product><brand><![CDATA[Volkswagen]]></brand><name><![CDATA[Tiguan Allspace	]]></name>
      <type_numberOfModel><![CDATA[e1*2001/116*0450*]]></type_numberOfModel><productionDates>28.11.2016 - 22.09.2018</productionDates></notifications>
    <notifications><caseNumber>SR/2</caseNumber><category><![CDATA[Toys]]></category><product>Doll</product><brand>X</brand></notifications>`;
  const r = parseCarRecalls(report);
  assert.equal(r.length, 1);
  assert.equal(r[0].published, "2026-10-29");
  assert.equal(r[0].name, "Tiguan Allspace");
  assert.equal(r[0].type_approval, "e1*2001/116*0450*");
});
