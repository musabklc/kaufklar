"use client";

import Link from "next/link";
import { ArrowRight, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { VERDICT } from "@/components/analysis/parts";
import { deleteAnalysis, useAnalyses } from "@/lib/storage";

export default function AnalysenPage() {
  const list = useAnalyses();

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <h1 className="text-3xl font-semibold tracking-tight">Meine Analysen</h1>
      <p className="mt-2 text-sm text-muted-foreground">Gespeichert nur in diesem Browser. Wir speichern keine Analysen auf unseren Servern.</p>
      {list && list.length === 0 && (
        <div className="mt-10 rounded-2xl border bg-card p-8 text-center">
          <p className="text-muted-foreground">Noch keine Analysen.</p>
          <Link href="/" className="mt-3 inline-flex items-center gap-1 font-medium text-brand">Erste Analyse starten <ArrowRight className="size-4" /></Link>
        </div>
      )}
      <ul className="mt-8 space-y-3">
        {list?.map((a) => {
          const v = a.vehicle;
          return (
            <li key={a.id} className="flex items-center gap-3 rounded-2xl border bg-card p-4">
              <Link href={`/analyse/${a.id}`} className="min-w-0 flex-1">
                <p className="truncate font-medium">{[v.make, v.model, v.variant].filter(Boolean).join(" ")}</p>
                <p className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                  <span className={`size-2 rounded-full ${VERDICT[a.recommendation.verdict].dot}`} />
                  {a.recommendation.verdict} · Risiko {a.scores.overallRisk} · {new Date(a.createdAt).toLocaleDateString("de-DE")}
                </p>
              </Link>
              <Button
                variant="ghost"
                size="icon-lg"
                aria-label="Analyse löschen"
                onClick={() => {
                  if (!confirm("Diese Analyse endgültig aus dem Browser löschen?")) return;
                  deleteAnalysis(a.id);
                }}
              >
                <Trash2 />
              </Button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
