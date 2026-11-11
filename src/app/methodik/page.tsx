import { KNOWLEDGE } from "@/lib/analysis/knowledge";
import { ProvenanceLegend } from "@/components/analysis/provenance";

export const metadata = { title: "Methodik & Quellen – Kaufklar" };

export default function Methodik() {
  return (
    <article className="mx-auto max-w-3xl space-y-5 px-4 py-12 text-sm leading-relaxed sm:px-6 [&_h2]:mt-10 [&_h2]:text-lg [&_h2]:font-semibold">
      <h1 className="text-3xl font-semibold tracking-tight">Methodik & Quellen</h1>
      <p className="text-muted-foreground">So entsteht eine Kaufklar-Analyse – nachvollziehbar und ohne erfundene Daten.</p>

      <h2>Kennzeichnung jeder Aussage</h2>
      <ProvenanceLegend />

      <h2>1. Fahrzeugdaten</h2>
      <p>Die KI liest nur aus, was im Inserat steht. Du prüfst und korrigierst die Daten, bevor die Analyse startet. Fehlende Angaben bleiben leer.</p>

      <h2>2. Wissensdatenbank</h2>
      <p>
        Motor- und Getriebeschwachstellen stammen aus einer kuratierten Datenbank. Die Zuordnung erfolgt über Marke, Kraftstoff, Hubraum, Baujahr und Leistung –
        den exakten Code solltest du über Fahrzeugschein oder FIN bestätigen. Aktuell enthalten:
      </p>
      <ul className="grid gap-2 sm:grid-cols-2">
        {KNOWLEDGE.map((k) => (
          <li key={k.id} className="rounded-lg border bg-card px-3 py-2">
            <span className="font-medium">{k.name}</span>
            <span className="block text-xs text-muted-foreground">{k.sources.map((s) => s.label).join(" · ")}</span>
          </li>
        ))}
      </ul>

      <h2>3. Regelprüfung & KI-Prüfung</h2>
      <p>
        Feste Regeln prüfen Vollständigkeit, Laufleistung pro Jahr, HU-Datum und auffällige Formulierungen. Die KI ergänzt Auffälligkeiten aus Text und Bildern
        sowie modellspezifische Hinweise, die nicht in der Datenbank stehen – diese sind immer als „KI-Einschätzung“ markiert.
      </p>

      <h2>4. Gesamtrisiko-Score (0–100)</h2>
      <p>Höher = riskanter. Gewichtung: technisches Risiko 40 %, Zustand 25 %, Inserat-Transparenz 20 %, Preisrisiko 15 %. Nicht bewertbare Teile werden neutral angesetzt und so ausgewiesen.</p>
      <p>Die Kaufempfehlung folgt nicht allein dem Score: Einzelne kritische Punkte (z. B. Export-/Bastlerhinweise oder bekannte schwere Schwachstellen ohne Nachweis) wirken direkt.</p>

      <h2>5. Preise & Kaufklar-Preisindex</h2>
      <p>
        Einen Marktwert schätzen wir nur aus mindestens drei Vergleichsangeboten (Median, fairer Bereich = mittlere 50 %). Quellen: der Kaufklar-Preisindex aus anonym gespeicherten,
        ausgelesenen Inseraten (gleiches Modell, Baujahr ±2, Kilometerstand ±40 %, letzte 18 Monate, Ausreißer gefiltert), optional Websuche-Treffer mit Link, und von dir eingetragene Preise.
        Ohne genug Vergleichsdaten nennen wir keinen Marktwert.
      </p>

      <h2>6. Monatskosten</h2>
      <p>
        Die Kfz-Steuer rechnen wir exakt nach Kraftfahrzeugsteuergesetz (Hubraum-Sockelbetrag plus CO₂-Komponente, ab 2021 progressiv; Altfahrzeuge vor 07/2009 nach Hubraum, E-Autos steuerbefreit).
        Kraftstoffpreis, Kilometer und Wartungs-Faustwert sind anpassbare Annahmen; Wertverlust und Finanzierung sind nicht enthalten.
      </p>

      <h2>7. Offene Datenquellen</h2>
      <p>
        Fehlende technische Angaben (CO₂, Verbrauch, Hubraum, Leistung, Motorcode) ergänzen wir aus den EU-Typdaten – nie werden Angaben aus dem Inserat überschrieben, und jede Ergänzung ist in der Analyse gekennzeichnet.
        Offizielle Pkw-Rückrufe gleichen wir über die Typgenehmigungsnummer bzw. den Modellnamen und den Produktionszeitraum ab.
      </p>

      <h2>8. Kaufklar-Community</h2>
      <p>
        Nutzer können Probleme melden. Jede Meldung wird automatisch geprüft (Spam, persönliche Daten, Plausibilität) und einem einheitlichen Problemtitel zugeordnet.
        In Analysen erscheint ein Problem erst, wenn mindestens drei verschiedene Personen es unabhängig gemeldet haben – gekennzeichnet als „Von Nutzern gemeldet“.
      </p>

      <h2>Quellen</h2>
      <ul className="list-disc space-y-1 pl-5">
        <li><a className="text-brand underline-offset-4 hover:underline" href="https://www.adac.de" target="_blank" rel="noopener noreferrer">ADAC</a> – Pannenstatistik und Autotests</li>
        <li><a className="text-brand underline-offset-4 hover:underline" href="https://www.kba.de" target="_blank" rel="noopener noreferrer">Kraftfahrt-Bundesamt</a> – Rückrufdatenbank (per FIN prüfen)</li>
        <li><a className="text-brand underline-offset-4 hover:underline" href="https://www.eea.europa.eu/en/datahub/datahubitem-view/fa8b1229-3db6-495d-b18e-9c9b3267c02b" target="_blank" rel="noopener noreferrer">Europäische Umweltagentur (EEA)</a> – CO₂-Monitoring Pkw, CC BY 4.0</li>
        <li><a className="text-brand underline-offset-4 hover:underline" href="https://ec.europa.eu/safety-gate-alerts/screen/webReport" target="_blank" rel="noopener noreferrer">EU Safety Gate</a> (Europäische Kommission) – Rückrufe, CC BY 4.0</li>
        <li>Meldungen der Kaufklar-Nutzer (moderiert, anonym)</li>
        <li>Herstellervorgaben laut Serviceheft / Wartungsplan</li>
        <li>Erfahrungswerte unabhängiger Werkstätten (nicht amtlich)</li>
      </ul>
    </article>
  );
}
