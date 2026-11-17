import { CheckCircle2, ExternalLink, XCircle } from "lucide-react";
import type { DealerCheck } from "@/lib/analysis/dealer";
import { safeHref } from "@/lib/guards";
import { Section } from "./parts";

const VERDICT: Record<DealerCheck["verdict"], { label: string; cls: string }> = {
  solide: { label: "Wirkt solide", cls: "bg-ok-soft text-ok" },
  pruefen: { label: "Genauer hinsehen", cls: "bg-warn-soft text-warn" },
  vorsicht: { label: "Vorsicht", cls: "bg-bad-soft text-bad" },
};

/** Händler-Check: Transparenz des gewerblichen Verkäufers auf einen Blick. */
export function DealerSection({ d }: { d: DealerCheck }) {
  const v = VERDICT[d.verdict];
  return (
    <Section id="haendler" eyebrow="Verkäufer" title="Händler-Check">
      <div className="flex flex-wrap items-center gap-3">
        <span className={`rounded-full px-3 py-1 text-sm font-semibold ${v.cls}`}>{v.label}</span>
        <p className="font-medium">
          {d.name}
          {d.city && <span className="font-normal text-muted-foreground"> · {d.city}</span>}
        </p>
      </div>
      <ul className="mt-5 grid gap-2.5 sm:grid-cols-2">
        {d.points.map((p) => (
          <li key={p.text} className="flex gap-2.5 text-sm">
            {p.ok ? <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-ok" /> : <XCircle className="mt-0.5 size-4 shrink-0 text-bad" />}
            {p.text}
          </li>
        ))}
      </ul>
      <div className="mt-5 flex flex-wrap gap-x-6 gap-y-2 text-sm font-medium">
        <a href={safeHref(d.reviewsUrl)} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-brand underline-offset-4 hover:underline">
          Google-Bewertungen ansehen <ExternalLink className="size-3.5" />
        </a>
        {safeHref(d.profileUrl) && (
          <a href={safeHref(d.profileUrl)} target="_blank" rel="noopener noreferrer nofollow" className="inline-flex items-center gap-1.5 text-brand underline-offset-4 hover:underline">
            Alle Autos dieses Händlers <ExternalLink className="size-3.5" />
          </a>
        )}
      </div>
      <p className="mt-5 rounded-xl bg-muted p-3 text-sm text-muted-foreground">
        Gut zu wissen: Kaufst du als Privatperson beim Händler, darf er die Sachmängelhaftung nicht ausschließen – bei Gebrauchtwagen nur auf ein Jahr verkürzen. Steht im
        Inserat „nur Export/Gewerbe“ oder „Bastlerfahrzeug“, obwohl das Auto fahrbereit ist, ist das ein Warnzeichen.
      </p>
      <p className="mt-3 text-xs text-muted-foreground">Aus den öffentlichen Angaben im Inserat. Sagt etwas über die Transparenz des Händlers, nicht über den Zustand des Autos.</p>
    </Section>
  );
}
