import { ExternalLink, Info } from "lucide-react";
import type { AnalysisResult } from "@/lib/types";
import { ProvenanceBadge } from "./provenance";
import { Section, fmt } from "./parts";

// Kategorien sind keine Bewertungen – daher neutral, Risikofarben bleiben den Bewertungen vorbehalten.
const CAT: Record<string, string> = {};

export function AlternativesSection({ r }: { r: AnalysisResult }) {
  return (
    <Section id="alternativen" eyebrow="Besser kaufen" title="Alternativen im gleichen Budget" pro>
      {r.alternatives.length === 0 ? (
        <p className="flex gap-2 rounded-xl bg-muted p-3 text-sm text-muted-foreground">
          <Info className="mt-0.5 size-4 shrink-0" /> Alternativen werden von der KI vorgeschlagen. Sie sind verfügbar, sobald ein KI-Schlüssel konfiguriert ist.
        </p>
      ) : (
        <>
          <ul className="grid gap-3 md:grid-cols-2">
            {r.alternatives.map((a) => (
              <li key={`${a.make}${a.model}${a.years}`} className="flex flex-col rounded-xl border p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <span className={`px-1.5 py-0.5 text-xs font-semibold ${CAT[a.category] ?? "bg-secondary text-foreground"}`}>{a.category}</span>
                  <ProvenanceBadge p="ki" />
                </div>
                <h3 className="mt-2 font-semibold">{a.make} {a.model}</h3>
                <p className="text-xs text-muted-foreground">{a.years} · {a.engineHint}</p>
                <p className="mt-2 text-sm">{a.reason}</p>
                <p className="mt-2 text-sm text-muted-foreground"><span className="font-medium text-foreground">Achte auf:</span> {a.watchOut}</p>
                <div className="mt-auto flex items-center justify-between gap-3 pt-4 text-sm">
                  <span className="text-muted-foreground tabular">
                    {a.indexMedian !== null ? <>Preisindex: <b className="text-foreground">{fmt(a.indexMedian)}</b> ({a.indexCount} Angebote)</> : "Noch keine Preisdaten"}
                  </span>
                  <a href={a.searchUrl} target="_blank" rel="noopener noreferrer" className="inline-flex shrink-0 items-center gap-1 font-medium text-brand hover:underline">
                    Angebote suchen <ExternalLink className="size-3.5" />
                  </a>
                </div>
              </li>
            ))}
          </ul>
          <p className="mt-4 text-xs text-muted-foreground">Vorschläge der KI auf Basis allgemein bekannter Zuverlässigkeitsdaten – vor dem Kauf genauso prüfen wie dieses Fahrzeug.</p>
        </>
      )}
    </Section>
  );
}
