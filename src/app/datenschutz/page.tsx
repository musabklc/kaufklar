export const metadata = { title: "Datenschutz – Kaufklar" };

const A = ({ href, children }: { href: string; children: React.ReactNode }) => (
  <a className="text-brand underline underline-offset-4" href={href} target="_blank" rel="noopener noreferrer">{children}</a>
);

export default function Datenschutz() {
  return (
    <article className="mx-auto max-w-2xl space-y-4 px-4 py-12 leading-relaxed sm:px-6 [&_h2]:mt-10 [&_h2]:text-xl [&_h2]:font-bold [&_h3]:mt-6 [&_h3]:font-semibold [&_ul]:list-disc [&_ul]:space-y-1 [&_ul]:pl-5">
      <h1 className="text-3xl font-bold">Datenschutzerklärung</h1>
      <p>Stand: November 2026. Diese Erklärung informiert dich darüber, welche personenbezogenen Daten bei der Nutzung von Kaufklar verarbeitet werden, wozu und auf welcher Rechtsgrundlage.</p>

      <h2>1. Verantwortlicher</h2>
      <p>
        Ahmed Kilic, Rubihornstr. 24, 86163 Augsburg, Deutschland<br />
        E-Mail: <a className="text-brand underline underline-offset-4" href="mailto:musabkilic38@gmail.com">musabkilic38@gmail.com</a>
      </p>
      <p>Kaufklar ist ein privates, nicht-kommerzielles und kostenloses Angebot. Es gibt kein Benutzerkonto, keine Werbung, keine Analyse- oder Tracking-Werkzeuge und keine Cookies.</p>

      <h2>2. Hosting und Server-Protokolle</h2>
      <p>
        Die Website wird bei Vercel Inc. (USA) gehostet. Beim Aufruf verarbeitet der Hoster technisch notwendige Daten: IP-Adresse, Datum und Uhrzeit, aufgerufene Adresse,
        Browser-Kennung (User-Agent) und Referrer. Das ist nötig, um die Seite auszuliefern und vor Angriffen zu schützen (Art. 6 Abs. 1 lit. f DSGVO, berechtigtes Interesse an
        einem sicheren Betrieb). Die Protokolle werden vom Hoster nach kurzer Zeit gelöscht. Eine Übermittlung in die USA ist möglich; sie erfolgt auf Grundlage des
        EU-US Data Privacy Framework bzw. der EU-Standardvertragsklauseln (Art. 45, 46 DSGVO).
        Mehr: <A href="https://vercel.com/legal/privacy-policy">Datenschutzerklärung von Vercel</A>.
      </p>
      <p>
        Zum Schutz vor Missbrauch (zu viele Anfragen) wird deine IP-Adresse zusätzlich für etwa eine Minute im Arbeitsspeicher des Servers gehalten und danach verworfen.
        Schriftarten werden von unserem eigenen Server geladen; es findet keine Verbindung zu Google Fonts statt.
      </p>

      <h2>3. Analyse eines Inserats</h2>
      <h3>Was verarbeitet wird</h3>
      <ul>
        <li>Fahrzeugdaten und Inseratstexte, die du eingibst oder die aus einem Inserat ausgelesen werden,</li>
        <li>hochgeladene Screenshots und Fotos,</li>
        <li>bei einem Link: die öffentliche Inseratsseite, die unser Server einmalig abruft (dabei werden keine Daten von dir an das Portal übermittelt).</li>
      </ul>
      <p>
        Zweck ist die Erstellung der Analyse, die du angefordert hast (Art. 6 Abs. 1 lit. b DSGVO bzw. lit. f – Bereitstellung des gewünschten Dienstes). Bilder werden nur im
        Arbeitsspeicher verarbeitet und nicht auf unseren Servern gespeichert. Bitte lade keine Bilder hoch, auf denen Personen, Kennzeichen oder Dokumente mit Namen zu sehen sind.
      </p>
      <h3>Künstliche Intelligenz (Google Gemini)</h3>
      <p>
        Zum Auslesen von Screenshots, zur Prüfung des Inserats und zur Moderation von Meldungen werden Texte und Bilder an die Gemini-API von Google übermittelt.
        Wir nutzen den kostenlosen Tarif. <b>Im kostenlosen Tarif verwendet Google die übermittelten Inhalte zur Verbesserung seiner Produkte; Inhalte können dabei auch von
        Menschen geprüft werden.</b> Eine Übermittlung in die USA findet statt (EU-US Data Privacy Framework bzw. Standardvertragsklauseln).
        Mehr: <A href="https://ai.google.dev/gemini-api/terms">Nutzungsbedingungen der Gemini-API</A> und <A href="https://policies.google.com/privacy">Datenschutzerklärung von Google</A>.
        Gib deshalb keine personenbezogenen Daten (Namen, Telefonnummern, Kennzeichen) in Beschreibungen oder Bildern ein.
      </p>
      <h3>Offene Datenquellen</h3>
      <p>Für Typdaten und Rückrufe werden nur Fahrzeugmerkmale (Marke, Modell, Baujahr, Hubraum, Leistung) mit unserer Datenbank abgeglichen – keine Daten über dich.</p>

      <h2>4. Speicherung in deinem Browser</h2>
      <p>
        Deine Analysen und der Stand deiner Checklisten werden ausschließlich lokal in deinem Browser (localStorage) gespeichert, nicht auf unseren Servern. Wir können darauf
        nicht zugreifen. Du kannst sie jederzeit unter „Meine Analysen“ oder über die Browser-Einstellungen löschen. Rechtsgrundlage ist § 25 Abs. 2 Nr. 2 TDDDG (unbedingt
        erforderlich für den von dir gewünschten Dienst).
      </p>

      <h2>5. Kaufklar-Preisindex</h2>
      <p>
        Aus ausgelesenen Inseraten speichern wir in unserer Datenbank: Marke, Modell, Variante, Kraftstoff, Baujahr, Kilometerstand, Leistung, Preis und ggf. den öffentlichen Link
        des Inserats. Daraus berechnen wir Marktwerte für andere Nutzer (Art. 6 Abs. 1 lit. f DSGVO). Angaben zum Verkäufer (Name, Telefonnummer, Standort) und Angaben über dich
        werden nicht gespeichert.
      </p>

      <h2>6. Problem-Meldungen</h2>
      <p>
        Meldest du ein Problem, speichern wir Fahrzeugangaben, Bauteil, Beschreibung, Kilometerstand und Kosten. Zur Missbrauchsabwehr (Mehrfach- und Massenmeldungen) speichern
        wir statt deiner IP-Adresse nur einen gesalzenen, nicht umkehrbaren Prüfwert aus IP-Adresse und Browser-Kennung. Die Beschreibung wird zur Prüfung an die KI übermittelt
        (siehe Abschnitt 3). Abgelehnte Meldungen speichern wir ohne Beschreibungstext. Rechtsgrundlage ist Art. 6 Abs. 1 lit. f DSGVO (Aufbau einer verlässlichen Mängeldatenbank für alle Nutzer).
      </p>

      <h2>7. Datenbank-Anbieter</h2>
      <p>
        Preisindex, Meldungen, Typ- und Rückrufdaten liegen bei Supabase Inc. in einem Rechenzentrum in Frankfurt am Main (EU). Mit dem Anbieter besteht ein
        Auftragsverarbeitungsverhältnis. Mehr: <A href="https://supabase.com/privacy">Datenschutzerklärung von Supabase</A>.
      </p>

      <h2>8. Speicherdauer</h2>
      <p>
        Preisindex-Einträge und Meldungen werden gespeichert, solange sie für Marktwerte bzw. die Mängeldatenbank benötigt werden; sie enthalten keine Angaben, über die wir dich
        identifizieren könnten. Server-Protokolle löscht der Hoster nach kurzer Zeit. Daten im Browser bleiben, bis du sie löschst.
      </p>

      <h2>9. Deine Rechte</h2>
      <p>Du hast das Recht auf Auskunft (Art. 15 DSGVO), Berichtigung (Art. 16), Löschung (Art. 17), Einschränkung der Verarbeitung (Art. 18), Datenübertragbarkeit (Art. 20) sowie
        auf <b>Widerspruch</b> gegen Verarbeitungen auf Grundlage berechtigter Interessen (Art. 21). Schreib dafür einfach an die oben genannte E-Mail-Adresse.</p>
      <p>
        Du kannst dich außerdem bei einer Datenschutz-Aufsichtsbehörde beschweren (Art. 77 DSGVO), zum Beispiel beim Bayerischen Landesamt für Datenschutzaufsicht
        (<A href="https://www.lda.bayern.de">www.lda.bayern.de</A>).
      </p>

      <h2>10. Pflicht zur Bereitstellung</h2>
      <p>Du bist nicht verpflichtet, Daten anzugeben. Ohne Fahrzeugangaben kann allerdings keine Analyse erstellt werden.</p>
    </article>
  );
}
