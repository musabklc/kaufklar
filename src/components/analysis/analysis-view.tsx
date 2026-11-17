"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Dashboard } from "@/components/analysis/dashboard";
import { saveAnalysis, useAnalysis } from "@/lib/storage";
import { loadSaved } from "@/app/analysen/actions";
import { confirmPayment, loadAnalysis } from "@/app/analyse/actions";

export function AnalysisView({ id }: { id: string }) {
  const analysis = useAnalysis(id);
  // Nicht in diesem Browser? Vom Server holen (geteilter Link, anderes Gerät) oder aus der Merkliste – dann hierher übernehmen.
  const [fromAccount, setFromAccount] = useState<"nein" | null>(null);
  const asked = useRef(false);
  // Freigeschaltet (Rückkehr von Stripe oder auf einem anderen Gerät bezahlt)? Dann die volle Fassung vom Server holen.
  const unlockChecked = useRef(false);
  useEffect(() => {
    if (!analysis?.locked || unlockChecked.current) return;
    unlockChecked.current = true;
    const session = new URLSearchParams(window.location.search).get("bezahlt");
    (session ? confirmPayment(id, session) : loadAnalysis(id))
      .then((a) => {
        if (a && !a.locked) saveAnalysis({ ...a, inspection: analysis.inspection, serviceBook: analysis.serviceBook });
        if (session) window.history.replaceState(null, "", window.location.pathname);
      })
      .catch(() => {});
  }, [analysis, id]);
  useEffect(() => {
    if (analysis !== null || asked.current) return;
    asked.current = true;
    loadAnalysis(id)
      .then((a) => a ?? loadSaved(id))
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
          Diese Analyse gibt es nicht (mehr). Analysen ohne Konto werden nach 90 Tagen gelöscht; mit einem Konto bleiben sie erhalten.
        </p>
        <Link href="/" className="mt-6 inline-block font-medium text-brand">Neue Analyse starten</Link>
      </div>
    );
  return <Dashboard r={analysis} />;
}
