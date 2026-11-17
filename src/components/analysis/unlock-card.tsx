"use client";

import { useState, useTransition } from "react";
import { CheckCircle2, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { startCheckout } from "@/app/analyse/actions";
import type { AnalysisResult } from "@/lib/types";
import { premiumPriceText } from "@/lib/analysis/premium";

const INCLUDED = [
  "Alle Schwachstellen mit Reparaturkosten (Spannen)",
  "Fazit des KI-Gutachters",
  "Marktpreis aus geprüften Vergleichsangeboten – sofern genug Daten da sind",
  "Verhandlungsstrategie mit Einstiegs- und Zielpreis",
  "Fragen an den Verkäufer",
  "Besichtigungs-Checkliste und Probefahrt-Leitfaden",
  "Alternativen im gleichen Budget",
];

export function UnlockCard({ r }: { r: AnalysisResult }) {
  const [consent, setConsent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const hidden = r.locked?.weakPoints ?? 0;

  return (
    <section id="premium" className="no-print scroll-mt-32 rounded-3xl bg-foreground p-6 text-background sm:p-10">
      <p className="flex items-center gap-2 text-sm font-medium text-background/70"><Lock className="size-4" /> Premium-Bericht</p>
      <h2 className="mt-2 text-3xl font-bold tracking-[-0.02em] sm:text-4xl">Der vollständige Kaufbericht für dieses Auto</h2>
      <p className="mt-3 max-w-2xl text-background/80">
        Du siehst die Ersteinschätzung{hidden ? ` und die wichtigsten Schwachstellen – ${hidden} weitere Punkte` : ""} und alle Kosten stehen im Bericht. Einmalig, kein Abo.
      </p>
      <ul className="mt-6 grid gap-2.5 sm:grid-cols-2">
        {INCLUDED.map((x) => (
          <li key={x} className="flex gap-2.5 text-sm"><CheckCircle2 className="mt-0.5 size-4 shrink-0" /> {x}</li>
        ))}
      </ul>
      <label className="mt-8 flex max-w-2xl gap-3 text-sm text-background/85">
        <Checkbox checked={consent} onCheckedChange={(c) => setConsent(c === true)} className="mt-0.5 border-background/50" />
        <span>
          Ich verlange ausdrücklich, dass Tachoklar sofort nach der Zahlung den Bericht freischaltet. Mir ist bekannt, dass mein Widerrufsrecht damit erlischt.
        </span>
      </label>
      <div className="mt-6 flex flex-wrap items-center gap-4">
        <Button
          size="lg"
          className="h-12 bg-background px-6 text-base text-foreground hover:bg-background/90"
          disabled={!consent || pending}
          onClick={() =>
            start(async () => {
              setError(null);
              const res = await startCheckout(r.id, consent);
              if ("url" in res) window.location.href = res.url;
              else setError(res.error);
            })
          }
        >
          {pending ? "Öffne Bezahlseite …" : `Bericht freischalten – ${premiumPriceText}`}
        </Button>
        <span className="text-sm text-background/60">Sichere Zahlung über Stripe</span>
      </div>
      {error && <p role="alert" className="mt-4 text-sm font-medium text-background">{error}</p>}
    </section>
  );
}
