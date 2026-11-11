export const metadata = { title: "Datenschutz – Kaufklar" };

export default function Datenschutz() {
  return (
    <article className="mx-auto max-w-2xl space-y-5 px-4 py-12 text-sm leading-relaxed sm:px-6 [&_h2]:mt-8 [&_h2]:text-lg [&_h2]:font-semibold">
      <h1 className="text-3xl font-semibold tracking-tight">Datenschutz</h1>
      <p className="rounded-xl bg-warn-soft p-3">
        Entwurf – vor dem öffentlichen Betrieb durch eine fachkundige Person prüfen und um Verantwortlichen, Kontaktdaten und Hosting-Anbieter ergänzen.
      </p>
      <h2>Welche Daten wir verarbeiten</h2>
      <p>Fahrzeugdaten, Inseratstexte, Links und hochgeladene Bilder, die du zur Analyse übermittelst. Wir benötigen kein Konto und keine personenbezogenen Angaben.</p>
      <h2>Bilder und Uploads</h2>
      <p>Bilder werden nur im Arbeitsspeicher verarbeitet und nicht auf unseren Servern gespeichert. Lade möglichst keine Bilder hoch, auf denen Personen, Kennzeichen oder Dokumente mit Namen erkennbar sind.</p>
      <h2>KI-Dienst</h2>
      <p>
        Für das Auslesen und die KI-Prüfung werden Inseratstexte und Bilder an die Gemini-API von Google übermittelt. <b>Im kostenlosen Tarif der Gemini-API
        verwendet Google die übermittelten Inhalte zur Verbesserung seiner Produkte</b>; im kostenpflichtigen Tarif nicht. Die Übermittlung kann in Drittländer (USA) erfolgen.
        Lade deshalb keine Bilder mit Personen, Kennzeichen oder Dokumenten hoch.
      </p>
      <h2>Kaufklar-Preisindex</h2>
      <p>
        Aus ausgelesenen Inseraten speichern wir anonym Marke, Modell, Variante, Kraftstoff, Baujahr, Kilometerstand, Leistung, Preis und ggf. den öffentlichen Link
        des Inserats, um Marktwerte zu berechnen. Personenbezogene Daten (z. B. Verkäufername, Telefonnummer, Standort) werden nicht gespeichert.
      </p>
      <h2>Problem-Meldungen</h2>
      <p>
        Meldest du ein Problem, speichern wir Fahrzeugangaben, Bauteil, Beschreibung, Kilometerstand und Kosten. Zur Missbrauchsabwehr speichern wir statt deiner IP-Adresse nur einen
        gesalzenen, nicht umkehrbaren Prüfwert. Die Beschreibung wird zur Moderation an die KI übermittelt. Abgelehnte Meldungen speichern wir ohne Beschreibungstext.
      </p>
      <h2>Speicherung der Ergebnisse</h2>
      <p>Analysen und der Stand deiner Checklisten werden ausschließlich lokal in deinem Browser (localStorage) gespeichert. Du kannst sie unter „Meine Analysen“ jederzeit löschen.</p>
      <h2>Link-Import</h2>
      <p>Fügst du einen Link ein, ruft der Server die öffentliche Inseratsseite einmalig ab. Es werden keine Cookies oder Zugangsdaten verwendet.</p>
    </article>
  );
}
