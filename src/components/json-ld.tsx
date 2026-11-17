/** Strukturierte Daten für Suchmaschinen (schema.org). "<" wird maskiert, damit Inhalte das Script-Tag nicht beenden können. */
export function JsonLd({ data }: { data: object }) {
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, "\u003c") }} />;
}
