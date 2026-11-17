export const metadata = { title: "Datenschutz – Tachoklar" };

const A = ({ href, children }: { href: string; children: React.ReactNode }) => (
  <a className="text-brand underline underline-offset-4" href={href} target="_blank" rel="noopener noreferrer">{children}</a>
);

export default function Datenschutz() {
  return (
    <article className="mx-auto max-w-2xl space-y-4 px-4 py-12 leading-relaxed sm:px-6 [&_h2]:mt-10 [&_h2]:text-xl [&_h2]:font-bold [&_h3]:mt-6 [&_h3]:font-semibold [&_ul]:list-disc [&_ul]:space-y-1 [&_ul]:pl-5">
      <h1 className="text-3xl font-bold">Datenschutzerklärung</h1>
      <p>Stand: November 2026. Diese Erklärung informiert dich darüber, welche personenbezogenen Daten bei der Nutzung von Tachoklar verarbeitet werden, wozu und auf welcher Rechtsgrundlage.</p>

      <h2>1. Verantwortlicher</h2>
      <p>
        Ahmed Kilic, Rubihornstr. 24, 86163 Augsburg, Deutschland<br />
        E-Mail: <a className="text-brand underline underline-offset-4" href="mailto:musabkilic38@gmail.com">musabkilic38@gmail.com</a>
      </p>
      <p>Tachoklar ist ein privates, nicht-kommerzielles und kostenloses Angebot. Ein Benutzerkonto brauchst du nur für das Forum. Es gibt keine Werbung, keine Analyse- oder Tracking-Werkzeuge und nur ein technisch notwendiges Cookie für die Forum-Anmeldung.</p>

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
        Außerdem liest die KI jeden Forumsbeitrag (Text, Thementitel, Unterforum und das im Profil angegebene Auto, ohne Benutzername oder E-Mail) und zieht
        Erfahrungen zu Schwachstellen und Pluspunkten eines Modells heraus; diese erscheinen in Fahrzeuganalysen unter „Aus dem Forum“ mit Link zum Beitrag
        (berechtigtes Interesse, Art. 6 Abs. 1 lit. f DSGVO: Erfahrungen der Community für andere Käufer nutzbar machen). Löschst du einen Beitrag, verschwinden auch diese Erkenntnisse.
        Wir nutzen den kostenpflichtigen Tarif. Laut den Nutzungsbedingungen verwendet Google die übermittelten Inhalte in diesem Tarif nicht zur Verbesserung seiner
        Produkte; sie werden nur für begrenzte Zeit zur Missbrauchserkennung gespeichert. Für die Schwachstellen recherchiert die KI zusätzlich über die Google-Suche –
        dabei werden nur Fahrzeugmerkmale (Marke, Modell, Baujahr, Motor) als Suchbegriffe verwendet.
        Eine Übermittlung in die USA findet statt (EU-US Data Privacy Framework bzw. Standardvertragsklauseln).
        Mehr: <A href="https://ai.google.dev/gemini-api/terms">Nutzungsbedingungen der Gemini-API</A> und <A href="https://policies.google.com/privacy">Datenschutzerklärung von Google</A>.
        Gib deshalb keine personenbezogenen Daten (Namen, Telefonnummern, Kennzeichen) in Beschreibungen oder Bildern ein.
      </p>
      <h3>Marktcheck (Kleinanzeigen)</h3>
      <p>
        Für die Preisbewertung ruft unser Server die öffentliche Autosuche von kleinanzeigen.de mit Marke, Modell, Baujahr- und Kilometerbereich auf und öffnet
        die passendsten Inserate, um Preis und Anbieterart (privat/gewerblich) abzulesen. Dabei werden keine Daten über dich übermittelt; die Anfrage kommt von unserem Server.
      </p>
      <h3>Offene Datenquellen</h3>
      <p>Für Typdaten und Rückrufe werden nur Fahrzeugmerkmale (Marke, Modell, Baujahr, Hubraum, Leistung) mit unserer Datenbank abgeglichen – keine Daten über dich.</p>

      <h3>Forum und Benutzerkonto</h3>
      <p>
        Für ein Forumskonto speichern wir deine E-Mail-Adresse, deinen Benutzernamen, ein verschlüsseltes (gehashtes) Passwort sowie Zeitpunkte von
        Registrierung und Anmeldung; dazu deine Beiträge und Meldungen. Rechtsgrundlage ist die Nutzung des Forums, die du mit der Registrierung anforderst
        (Art. 6 Abs. 1 lit. b DSGVO). Die E-Mail-Adresse nutzen wir nur für die Bestätigung, das Zurücksetzen des Passworts und wichtige Hinweise zum Konto,
        nicht für Werbung. Benutzername und Beiträge sind öffentlich sichtbar, deine E-Mail-Adresse nicht. Die Konten werden bei Supabase (Rechenzentrum
        Frankfurt) verwaltet; dabei protokolliert Supabase zur Sicherheit auch IP-Adressen von Anmeldeversuchen für begrenzte Zeit.
        Du kannst dein Konto jederzeit unter „Konto“ selbst löschen; Profil und alle deine Beiträge werden dann endgültig gelöscht.
        Gemeldete Beiträge und die Meldungen dazu speichern wir, bis die Prüfung abgeschlossen ist.
      </p>
      <p>
        Freiwillig kannst du ein Profilbild hochladen und angeben, welches Auto du fährst (Art. 6 Abs. 1 lit. a DSGVO, Einwilligung durch das
        Hochladen bzw. Eintragen). Beides ist bei deinen Beiträgen öffentlich sichtbar. Das Bild wird schon in deinem Browser auf 256 × 256 Pixel
        verkleinert; dabei gehen eingebettete Metadaten wie Kamera- oder GPS-Angaben verloren. Es liegt im Speicher von Supabase (Frankfurt). Du kannst
        Bild und Auto jederzeit unter „Konto“ ändern oder entfernen; beim Löschen des Kontos werden beide mitgelöscht.
      </p>
      <p>
        Die Forensuche durchsucht nur öffentliche Titel und Beiträge. Suchbegriffe speichern wir nicht.
      </p>
      <h3>Fotos im Forum</h3>
      <p>
        Fotos in Beiträgen werden schon in deinem Browser verkleinert und neu gespeichert; dabei gehen eingebettete Metadaten wie GPS-Ort und Kamera verloren.
        Sie liegen öffentlich sichtbar im Speicher von Supabase (Frankfurt) und werden mit dem Beitrag oder deinem Konto gelöscht. Bitte keine Kennzeichen oder Personen fotografieren.
      </p>
      <h3>Besichtigung und Scheckheft</h3>
      <p>
        Fotos, die du bei der Besichtigung aufnimmst (Auto oder Scheckheft), schicken wir nur zur Auswertung an die Gemini-API von Google (siehe oben) und speichern sie nicht.
        Das Ergebnis liegt nur in deinem Browser bzw. – wenn du die Analyse merkst – in deinem Konto. Auf Scheckheft-Fotos können Namen von Vorbesitzern oder Werkstätten stehen;
        diese verwenden wir nicht weiter.
      </p>
      <h3>Meine Garage</h3>
      <p>
        Autos in deiner Garage (Bezeichnung, Baujahr, Kilometerstand, HU-, Service- und Zahnriemen-Termin, Notiz) speichern wir in deinem Konto, um dich per E-Mail an
        fällige Termine zu erinnern (Art. 6 Abs. 1 lit. b DSGVO). Löschst du ein Auto oder dein Konto, sind die Daten weg.
      </p>
      <h3>Auto-Finder und Wertermittlung</h3>
      <p>
        Deine Angaben im Auto-Finder (Budget, Fahrprofil, Wünsche) gehen ohne Bezug zu deiner Person an die Gemini-API. Für die Wertermittlung suchen wir öffentliche Angebote
        vergleichbarer Autos; deine Eingaben speichern wir nicht, die gefundenen Angebotspreise fließen anonym in unseren Preisindex.
      </p>
      <h3>Merkliste, Preisalarm und Benachrichtigungen</h3>
      <p>
        Wenn du angemeldet eine Analyse „merkst“, speichern wir sie in deinem Konto (Supabase, Frankfurt), damit du sie auf jedem Gerät öffnen kannst
        (Art. 6 Abs. 1 lit. b DSGVO). Mit eingeschaltetem Preisalarm öffnet unser Server das Inserat einmal täglich, liest Preis und Status und schickt dir
        eine E-Mail, wenn der Preis sinkt oder das Inserat verschwindet. Ebenso bekommst du eine E-Mail bei neuen Antworten auf deine Forenthemen
        (höchstens eine pro Thema und Stunde). Beides kannst du jederzeit abschalten: Preisalarm unter „Meine Analysen“, Antwort-Mails unter „Konto“.
        Entfernst du ein gemerktes Auto oder löschst du dein Konto, werden die Daten gelöscht.
      </p>
      <p>
        E-Mails (Bestätigung, Passwort, Preisalarm, Antworten) versenden wir über Resend (Resend, Inc., USA; Versand über Server in der EU, Irland).
        Dabei werden deine E-Mail-Adresse und der Inhalt der Nachricht übermittelt. Grundlage für die Übermittlung in die USA sind die
        Standardvertragsklauseln der EU-Kommission. Mehr: <A href="https://resend.com/legal/privacy-policy">Datenschutzerklärung von Resend</A>.
      </p>
      <p>
        Für die Anmeldung setzen wir ein technisch notwendiges Cookie (Sitzung), ohne das der Login nicht funktioniert (§ 25 Abs. 2 Nr. 2 TDDDG).
        Es wird nur gesetzt, wenn du dich anmeldest, und enthält keine Tracking-Daten.
      </p>

      <h2>4. Speicherung deiner Analysen</h2>
      <p>
        Jede Analyse (Fahrzeugdaten aus dem Inserat und das Ergebnis) speichern wir auf unserem Server unter einer zufälligen Kennung, damit der Link zur Analyse auf jedem
        Gerät funktioniert. Bist du angemeldet, wird sie deinem Konto zugeordnet und bleibt bis zur Löschung oder Kontolöschung erhalten; ohne Konto löschen wir sie
        automatisch nach 90 Tagen. Hochgeladene Bilder speichern wir dabei nicht. Rechtsgrundlage ist Art. 6 Abs. 1 lit. b DSGVO (der von dir gewünschte Dienst).
      </p>
      <p>
        Zusätzlich liegen deine Analysen und der Stand deiner Checklisten in deinem Browser (localStorage). Du kannst Analysen jederzeit unter „Meine Analysen“ löschen – das
        entfernt sie im Browser und auf unserem Server. Rechtsgrundlage für die Speicherung im Browser ist § 25 Abs. 2 Nr. 2 TDDDG.
      </p>
      <p>
        Für Kostenkontrolle und Missbrauchsschutz zählen wir Anfragen pro Besucher anhand eines gesalzenen, nicht umkehrbaren Hashwerts der IP-Adresse (gelöscht nach 24 Stunden)
        und protokollieren KI-Aufrufe ohne Inhalte und ohne Personenbezug (Modell, Dauer, Token-Anzahl, Fehlerart). Rechtsgrundlage ist Art. 6 Abs. 1 lit. f DSGVO.
      </p>

      <h2>5. Tachoklar-Preisindex</h2>
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
