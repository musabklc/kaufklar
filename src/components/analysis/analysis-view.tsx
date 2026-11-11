"use client";

import Link from "next/link";
import { Dashboard } from "@/components/analysis/dashboard";
import { useAnalysis } from "@/lib/storage";

export function AnalysisView({ id }: { id: string }) {
  const analysis = useAnalysis(id);

  if (analysis === undefined) return <div className="mx-auto max-w-6xl px-4 py-20 text-sm text-muted-foreground">Lade Analyse …</div>;
  if (!analysis)
    return (
      <div className="mx-auto max-w-md px-4 py-20 text-center">
        <h1 className="text-xl font-semibold">Analyse nicht gefunden</h1>
        <p className="mt-2 text-sm text-muted-foreground">Analysen werden nur in diesem Browser gespeichert. Auf einem anderen Gerät oder nach dem Löschen der Browserdaten sind sie nicht verfügbar.</p>
        <Link href="/" className="mt-6 inline-block font-medium text-brand">Neue Analyse starten</Link>
      </div>
    );
  return <Dashboard r={analysis} />;
}
