export const metadata = { title: "Impressum – Kaufklar" };

// Platzhalter in [eckigen Klammern] vor dem Livegang durch echte Angaben ersetzen.
export default function Impressum() {
  return (
    <article className="mx-auto max-w-2xl space-y-5 px-4 py-12 leading-relaxed sm:px-6 [&_h2]:mt-8 [&_h2]:text-lg [&_h2]:font-semibold">
      <h1 className="text-3xl font-bold">Impressum</h1>
      <p className="bg-warn-soft p-3 text-sm">Vorlage – alle Angaben in eckigen Klammern vor der Veröffentlichung ersetzen und rechtlich prüfen lassen.</p>
      <h2>Angaben gemäß § 5 DDG</h2>
      <p>
        [Vor- und Nachname bzw. Firmenname mit Rechtsform]<br />
        [Straße und Hausnummer]<br />
        [PLZ Ort]<br />
        Deutschland
      </p>
      <h2>Kontakt</h2>
      <p>
        E-Mail: [E-Mail-Adresse]<br />
        Telefon: [Telefonnummer]
      </p>
      <h2>Umsatzsteuer-ID</h2>
      <p>[Umsatzsteuer-Identifikationsnummer gemäß § 27a UStG – nur falls vorhanden, sonst Abschnitt entfernen]</p>
      <h2>Verantwortlich für den Inhalt nach § 18 Abs. 2 MStV</h2>
      <p>[Name, Anschrift wie oben]</p>
      <h2>Datenquellen</h2>
      <p>
        EU-Typdaten: Europäische Umweltagentur (EEA), CC BY 4.0. Rückrufdaten: EU Safety Gate, Europäische Kommission, CC BY 4.0.
        Details unter „Methodik & Quellen“.
      </p>
      <h2>Haftungshinweis</h2>
      <p>
        Kaufklar gibt eine automatisierte, unverbindliche Einschätzung. Sie ersetzt keine Begutachtung durch eine Fachwerkstatt oder Prüforganisation. Kostenangaben sind Richtwerte.
      </p>
    </article>
  );
}
