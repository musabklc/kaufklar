import Link from "next/link";

export const metadata = { title: "Forenregeln – Tachoklar", description: "Regeln für das Tachoklar-Forum: sachlich bleiben, keine Werbung, keine persönlichen Daten.", alternates: { canonical: "/forum/regeln" } };

export default function Regeln() {
  return (
    <article className="prose-kk mx-auto max-w-3xl px-4 py-10 sm:px-6 lg:py-16">
      <h1 className="text-4xl font-semibold tracking-[-0.03em]">Forenregeln und Nutzungsbedingungen</h1>
      <p className="mt-4 text-muted-foreground">Stand: November 2026</p>

      <h2 className="mt-10 text-2xl font-semibold">1. Worum es geht</h2>
      <p className="mt-3">Das Tachoklar-Forum ist ein kostenloser, nicht-kommerzieller Treffpunkt für Menschen, die einen Gebrauchtwagen suchen oder fahren. Lesen kann jeder; zum Schreiben brauchst du ein Konto. Mindestalter: 16 Jahre.</p>

      <h2 className="mt-10 text-2xl font-semibold">2. Was nicht erlaubt ist</h2>
      <ul className="mt-3 list-disc space-y-1 pl-6">
        <li>Beleidigungen, Hetze, Drohungen, Diskriminierung</li>
        <li>rechtswidrige Inhalte (z. B. Betrug, Urheberrechtsverletzungen, verbotene Symbole)</li>
        <li>persönliche Daten anderer: Namen, Telefonnummern, Adressen, Kennzeichen, Fotos von Personen</li>
        <li>Werbung, Spam, Verkaufsangebote gewerblicher Händler, Affiliate-Links</li>
        <li>Anschuldigungen gegen konkrete Personen oder Firmen ohne Belege</li>
        <li>mehrere Konten für eine Person, Konten unter fremdem Namen</li>
      </ul>

      <h2 className="mt-10 text-2xl font-semibold">3. Deine Beiträge</h2>
      <p className="mt-3">Du bist für deine Beiträge verantwortlich. Sie sind öffentlich lesbar und erscheinen unter deinem Benutzernamen. Du kannst sie jederzeit selbst löschen. Mit dem Veröffentlichen erlaubst du uns, sie im Forum anzuzeigen. Erfahrungsberichte sind persönliche Meinungen, keine Gutachten.</p>

      <h2 className="mt-10 text-2xl font-semibold">4. Melden und Moderation</h2>
      <p className="mt-3">
        Unter jedem Beitrag kannst du ihn melden. Nach drei Meldungen wird ein Beitrag automatisch ausgeblendet, bis wir ihn geprüft haben. Rechtswidrige Inhalte kannst du auch ohne Konto per E-Mail melden (Kontakt im{" "}
        <Link href="/impressum" className="text-brand underline">Impressum</Link>); bitte nenne den Link zum Beitrag und den Grund. Wir prüfen Meldungen zeitnah, entfernen Inhalte, die gegen diese Regeln oder Gesetze verstoßen, und können Konten sperren. Wenn wir einen Beitrag von dir entfernen, kannst du per E-Mail widersprechen.
      </p>

      <h2 className="mt-10 text-2xl font-semibold">5. Konto löschen</h2>
      <p className="mt-3">Du kannst dein Konto jederzeit unter <Link href="/konto" className="text-brand underline">Konto</Link> löschen. Dabei werden dein Profil und alle deine Beiträge endgültig gelöscht.</p>

      <h2 className="mt-10 text-2xl font-semibold">6. Haftung</h2>
      <p className="mt-3">Wir übernehmen keine Gewähr für Richtigkeit und Vollständigkeit der Beiträge anderer Nutzer. Kauf- und Reparaturentscheidungen triffst du selbst; im Zweifel hilft eine Werkstatt oder Prüforganisation.</p>
    </article>
  );
}
