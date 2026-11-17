"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Dashboard } from "@/components/analysis/dashboard";
import { saveAnalysis, useAnalysis } from "@/lib/storage";
import { loadSaved } from "@/app/analysen/actions";

export function AnalysisView({ id }: { id: string }) {
  const analysis = useAnalysis(id);
  // Nicht in diesem Browser? Vielleicht im Konto gemerkt (anderes Gerät) – dann hierher übernehmen.
  const [fromAccount, setFromAccount] = useState<"nein" | null>(null);
  const asked = useRef(false);
  useEffect(() => {
    if (analysis !== null || asked.current) return;
    asked.current = true;
    loadSaved(id)
      .then((a) => (a ? saveAnalysis(a) : setFromAccount("nein")))
      .catch(() => setFromAccount("nein"));
  }, [analysis, id]);

  if (analysis === undefined || (analysis === null && fromAccount !== "nein"))
    return <div className="mx-auto max-w-[78rem] px-4 py-20 text-sm text-muted-foreground">Lade Analyse …</div>;
  if (!analysis)
    return (
      <div className="mx-auto max-w-md px-4 py-20 text-center">
        <h1 className="text-xl font-semibold">Analyse nicht gefunden</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Analysen liegen in dem Browser, in dem du sie erstellt hast. Mit einem Konto kannst du sie merken und auf jedem Gerät öffnen.
        </p>
        <Link href="/" className="mt-6 inline-block font-medium text-brand">Neue Analyse starten</Link>
      </div>
    );
  return <Dashboard r={analysis} />;
}
