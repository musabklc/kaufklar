import Link from "next/link";
import type { Metadata } from "next";
import { JsonLd } from "@/components/json-ld";
import { SITE_URL } from "@/lib/site";

export const metadata: Metadata = {
  title: { absolute: "Gebrauchtwagen prüfen: Checkliste für Inserat, Besichtigung und Probefahrt | Tachoklar" },
  description:
    "Gebrauchtwagen richtig prüfen: worauf du im Inserat, bei Unterlagen, Besichtigung, Probefahrt und Kaufvertrag achten musst – als Checkliste. Dazu der kostenlose Online-Check für dein Inserat.",
  alternates: { canonical: "/gebrauchtwagen-pruefen" },
};

const STEPS: { id: string; title: string; intro: string; items: string[] }[] = [
  {
    id: "inserat",
    title: "1. Das Inserat prüfen – bevor du hinfährst",
    intro: "Die meisten Fehlkäufe lassen sich schon am Inserat erkennen. Nimm dir zehn Minuten, bevor du einen Termin ausmachst.",
    items: [
      "Preis mit vergleichbaren Angeboten abgleichen (gleiches Modell, ähnliches Baujahr und Kilometerstand). Deutlich zu günstig ist ein Warnzeichen.",
      "Kilometerstand und Alter zusammen ansehen: Rund 10.000 bis 20.000 km pro Jahr sind üblich. Sehr wenig ist nur glaubwürdig, wenn es belegt ist.",
      "Motor und Getriebe genau bestimmen. Viele Modelle haben einzelne Motoren mit bekannten Schwachstellen (Steuerkette, Injektoren, Doppelkupplung).",
      "Fotos genau ansehen: Lackunterschiede, ungleiche Spaltmaße, Warnleuchten im Tacho, abgenutztes Lenkrad bei angeblich wenig Kilometern.",
      "Formulierungen wie „Export/Gewerbe“, „Bastlerfahrzeug“ oder „ohne Garantie“ bei einem Händler kritisch sehen.",
      "Nie Geld vorab überweisen, bevor du das Auto gesehen hast.",
    ],
  },
  {
    id: "unterlagen",
    title: "2. Die Unterlagen",
    intro: "Lass dir die Papiere vor Ort zeigen und gleiche sie mit dem Auto ab.",
    items: [
      "Zulassungsbescheinigung Teil I und Teil II: Steht der Verkäufer als Halter drin? Wenn nicht, warum nicht?",
      "Fahrgestellnummer (FIN) an Karosserie und in den Papieren vergleichen.",
      "Serviceheft oder Werkstattrechnungen: lückenlose Wartung, plausible Kilometerstände in aufsteigender Reihenfolge.",
      "Letzter HU-Bericht: Welche Mängel wurden notiert? Wann ist die nächste HU fällig?",
      "Bei Zahnriemen-Motoren: Rechnung über den letzten Wechsel. Bei Automatik: Getriebeölwechsel.",
      "Offene Rückrufe beim Markenhändler per FIN prüfen lassen.",
    ],
  },
  {
    id: "besichtigung",
    title: "3. Die Besichtigung",
    intro: "Am besten bei Tageslicht, trockenem Wetter und mit kaltem Motor – manche Fehler zeigen sich nur beim Kaltstart.",
    items: [
      "Karosserie rundherum: Rost an Schwellern, Radläufen und Türunterkanten, Dellen, Lackunterschiede, Spaltmaße.",
      "Unterboden und Bremsleitungen ansehen, so weit möglich. Ölspuren unter dem Auto?",
      "Reifen: Profiltiefe (mindestens 3 mm sinnvoll), Alter über die DOT-Nummer, gleichmäßige Abnutzung.",
      "Motorraum: Ölstand und Ölfarbe, Kühlmittel, feuchte Stellen, Marderschäden.",
      "Innenraum: Abnutzung passend zum Kilometerstand, Feuchtigkeit oder Modergeruch, alle Schalter und die Klimaanlage testen.",
      "Kaltstart: Klappern, Rasseln oder blauer bzw. schwarzer Rauch sind Warnzeichen.",
    ],
  },
  {
    id: "probefahrt",
    title: "4. Die Probefahrt",
    intro: "Mindestens 20 Minuten, Stadt und Landstraße, wenn möglich ein Stück Autobahn.",
    items: [
      "Kupplung und Gangwechsel: Rutscht die Kupplung, kracht ein Gang, ruckelt die Automatik?",
      "Bremsen: zieht das Auto zur Seite, vibriert das Pedal?",
      "Lenkung und Fahrwerk: Geradeauslauf, Poltern über Unebenheiten, Geräusche beim Einlenken.",
      "Motor: gleichmäßige Leistung, keine Warnleuchten, Temperatur bleibt stabil.",
      "Nach der Fahrt: Motor laufen lassen und auf Gerüche, Rauch und Tropfen achten.",
    ],
  },
  {
    id: "kaufvertrag",
    title: "5. Preis und Kaufvertrag",
    intro: "Erst verhandeln, wenn du alles gesehen hast – Mängel und fällige Wartungen sind deine Argumente.",
    items: [
      "Schriftlicher Kaufvertrag mit FIN, Kilometerstand, bekannten Mängeln und Zubehör.",
      "„Unfallfrei“ und den Kilometerstand ausdrücklich in den Vertrag schreiben lassen.",
      "Beim Händler gilt Sachmängelhaftung: Gegenüber Privatkäufern darf er sie bei Gebrauchtwagen nur auf ein Jahr verkürzen, nicht ausschließen.",
      "Unsicher? Vor dem Kauf einen Gebrauchtwagencheck in einer freien Werkstatt oder bei einer Prüforganisation machen lassen.",
    ],
  },
];

const FAQ: [string, string][] = [
  [
    "Wie kann ich einen Gebrauchtwagen online prüfen?",
    "Füge bei Tachoklar den Link oder Screenshots des Inserats ein. Du bekommst in etwa einer Minute die typischen Schwachstellen des Motors und Getriebes mit Reparaturkosten, einen Preisvergleich mit echten Angeboten, offizielle EU-Rückrufe und die wichtigsten Fragen an den Verkäufer. Das ersetzt keine Besichtigung, zeigt dir aber, worauf du dort achten musst.",
  ],
  [
    "Was kostet ein Gebrauchtwagencheck?",
    "Der Online-Check bei Tachoklar ist kostenlos. Ein Gebrauchtwagencheck vor Ort in einer Werkstatt oder bei einer Prüforganisation kostet meist zwischen etwa 50 und 150 Euro – bei teureren Autos lohnt er sich fast immer.",
  ],
  [
    "Woran erkenne ich einen manipulierten Kilometerstand?",
    "Vergleiche den Tachostand mit Serviceheft, Rechnungen und HU-Berichten: Die Kilometer müssen von Eintrag zu Eintrag steigen. Achte auf Abnutzung von Lenkrad, Pedalen und Fahrersitz, die zum Kilometerstand passen muss. Ein Händler kann außerdem die im Steuergerät gespeicherten Werte auslesen.",
  ],
  [
    "Was sollte ich den Verkäufer vorab fragen?",
    "Wenige, gezielte Fragen kommen besser an als ein langer Katalog: Ist der Wagen noch da? Gibt es ein Serviceheft oder Rechnungen? Wurde die bekannte Schwachstelle dieses Motors (z. B. Steuerkette oder Zahnriemen) schon gemacht? Den Rest klärst du bei der Besichtigung.",
  ],
  [
    "Lohnt sich ein Gebrauchtwagen mit hoher Laufleistung?",
    "Das hängt vor allem vom Motor und der Wartung ab. Manche Motoren laufen mit guter Pflege weit über 250.000 km, andere haben bekannte teure Schwachstellen ab 150.000 km. Wichtig sind belegte Wartung und ein Preis, der anstehende Reparaturen berücksichtigt.",
  ],
];

export default function GebrauchtwagenPruefenPage() {
  const url = `${SITE_URL}/gebrauchtwagen-pruefen`;
  return (
    <article className="mx-auto max-w-4xl px-4 py-10 sm:px-6 lg:py-16">
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@graph": [
            {
              "@type": "BreadcrumbList",
              itemListElement: [
                { "@type": "ListItem", position: 1, name: "Tachoklar", item: SITE_URL },
                { "@type": "ListItem", position: 2, name: "Gebrauchtwagen prüfen", item: url },
              ],
            },
            { "@type": "Article", headline: "Gebrauchtwagen prüfen: Checkliste für Inserat, Besichtigung und Probefahrt", url, inLanguage: "de-DE", publisher: { "@id": `${SITE_URL}/#org` } },
            { "@type": "FAQPage", mainEntity: FAQ.map(([q, a]) => ({ "@type": "Question", name: q, acceptedAnswer: { "@type": "Answer", text: a } })) },
          ],
        }}
      />
      <h1 className="text-4xl font-semibold tracking-[-0.03em] text-balance sm:text-6xl">Gebrauchtwagen prüfen: die Checkliste</h1>
      <p className="mt-5 max-w-2xl text-lg">
        Worauf du beim Gebrauchtwagenkauf achten musst – vom Inserat über Unterlagen und Besichtigung bis zur Probefahrt und zum Kaufvertrag. Für das konkrete Auto prüft Tachoklar das Inserat
        kostenlos für dich.
      </p>

      <section className="mt-8 rounded-3xl bg-foreground p-6 text-background sm:p-8">
        <h2 className="text-2xl font-semibold">Dein Inserat in einer Minute prüfen</h2>
        <p className="mt-2 text-background/80">Link oder Screenshot einfügen: Schwachstellen des Motors mit Reparaturkosten, echter Marktpreis, Rückrufe und die richtigen Fragen an den Verkäufer.</p>
        <Link href="/#pruefen" className="mt-6 inline-flex h-12 items-center rounded-full bg-primary px-6 font-medium text-primary-foreground">Gebrauchtwagen jetzt prüfen</Link>
      </section>

      <nav aria-label="Inhalt" className="mt-10 flex flex-wrap gap-2 text-sm">
        {STEPS.map((s) => (
          <a key={s.id} href={`#${s.id}`} className="rounded-full bg-card px-3 py-1.5 font-medium hover:underline">{s.title.replace(/^\d+\.\s*/, "")}</a>
        ))}
      </nav>

      {STEPS.map((s) => (
        <section key={s.id} id={s.id} className="mt-12 scroll-mt-24">
          <h2 className="text-2xl font-semibold sm:text-3xl">{s.title}</h2>
          <p className="mt-3 max-w-3xl">{s.intro}</p>
          <ul className="mt-5 space-y-3">
            {s.items.map((i) => (
              <li key={i} className="flex gap-3 rounded-2xl bg-card p-4">
                <span className="mt-1.5 size-2 shrink-0 rounded-full bg-brand" />
                {i}
              </li>
            ))}
          </ul>
        </section>
      ))}

      <section className="mt-12">
        <h2 className="text-2xl font-semibold sm:text-3xl">Typische Schwachstellen nach Modell</h2>
        <p className="mt-3 max-w-3xl">
          Viele teure Schäden hängen am Motor oder Getriebe – und die sind von Modell zu Modell verschieden. In unseren Ratgebern findest du die bekannten Probleme mit Kosten und
          Prüftipps, zum Beispiel für BMW N47, VW DSG oder PureTech-Motoren.
        </p>
        <Link href="/schwachstellen" className="mt-4 inline-block font-medium text-brand underline-offset-4 hover:underline">Alle Schwachstellen-Ratgeber ansehen →</Link>
        <p className="mt-3 text-sm text-muted-foreground">
          Noch unentschlossen? Der <Link href="/finder" className="text-brand underline-offset-4 hover:underline">Auto-Finder</Link> schlägt zuverlässige Modelle für dein Budget vor.
          Eigenes Auto in Zahlung geben? <Link href="/wert" className="text-brand underline-offset-4 hover:underline">Was ist mein Auto wert?</Link>
        </p>
      </section>

      <section className="mt-12">
        <h2 className="text-2xl font-semibold sm:text-3xl">Häufige Fragen</h2>
        <div className="mt-5 space-y-3">
          {FAQ.map(([q, a]) => (
            <details key={q} className="group rounded-2xl bg-card p-5">
              <summary className="cursor-pointer list-none font-semibold [&::-webkit-details-marker]:hidden">{q}</summary>
              <p className="mt-3 leading-relaxed">{a}</p>
            </details>
          ))}
        </div>
      </section>
    </article>
  );
}
