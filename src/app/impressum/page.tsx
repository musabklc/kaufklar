export const metadata = { title: "Impressum – Kaufklar" };

export default function Impressum() {
  return (
    <article className="mx-auto max-w-2xl space-y-5 px-4 py-12 leading-relaxed sm:px-6 [&_h2]:mt-8 [&_h2]:text-lg [&_h2]:font-semibold">
      <h1 className="text-3xl font-bold">Impressum</h1>
      <h2>Angaben gemäß § 5 DDG</h2>
      <p>
        Ahmed Kilic<br />
        Rubihornstr. 24<br />
        86163 Augsburg<br />
        Deutschland
      </p>
      <h2>Kontakt</h2>
      <p>
        E-Mail: <a className="text-brand underline underline-offset-4" href="mailto:musabkilic38@gmail.com">musabkilic38@gmail.com</a>
      </p>
      <h2>Art des Angebots</h2>
      <p>Kaufklar ist ein privates, nicht-kommerzielles und kostenloses Hilfsangebot für Gebrauchtwagenkäufer. Es gibt keine kostenpflichtigen Leistungen und keine Werbung.</p>
      <h2>Verantwortlich für den Inhalt</h2>
      <p>Ahmed Kilic, Anschrift wie oben.</p>
      <h2>Haftung für Inhalte</h2>
      <p>
        Kaufklar erstellt automatisierte, unverbindliche Einschätzungen auf Grundlage der eingegebenen Inseratsdaten, offener Datenquellen und künstlicher Intelligenz.
        Sie ersetzen keine Begutachtung durch eine Fachwerkstatt oder Prüforganisation. Kostenangaben sind Richtwerte. Für Kaufentscheidungen, die auf Grundlage dieser
        Einschätzungen getroffen werden, wird keine Haftung übernommen, soweit gesetzlich zulässig.
      </p>
      <h2>Haftung für Links</h2>
      <p>
        Das Angebot enthält Links zu externen Websites (z. B. Inseratsportale, Behörden). Auf deren Inhalte habe ich keinen Einfluss; für sie ist der jeweilige Anbieter verantwortlich.
        Bei Bekanntwerden von Rechtsverletzungen werden entsprechende Links umgehend entfernt.
      </p>
      <h2>Datenquellen</h2>
      <p>
        EU-Typdaten: Europäische Umweltagentur (EEA), CC BY 4.0. Rückrufdaten: EU Safety Gate, Europäische Kommission, CC BY 4.0.
        Details unter „Methodik & Quellen“.
      </p>
      <h2>Verbraucherstreitbeilegung</h2>
      <p>Ich bin nicht bereit und nicht verpflichtet, an Streitbeilegungsverfahren vor einer Verbraucherschlichtungsstelle teilzunehmen.</p>
    </article>
  );
}
