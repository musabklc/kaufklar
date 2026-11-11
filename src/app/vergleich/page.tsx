"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, Trophy } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { ProBadge, VERDICT, fmt } from "@/components/analysis/parts";
import { defaultMonthly } from "@/components/analysis/costs-section";
import { compare } from "@/lib/analysis/compare";
import { useAnalyses } from "@/lib/storage";
import type { AnalysisResult } from "@/lib/types";

const title = (r: AnalysisResult) => [r.vehicle.make, r.vehicle.model, r.vehicle.variant].filter(Boolean).join(" ");

export default function VergleichPage() {
  const list = useAnalyses();
  const [sel, setSel] = useState<string[]>([]);
  const chosen = (list ?? []).filter((a) => sel.includes(a.id));
  // Nur Kostenposten vergleichen, die für alle gewählten Autos bekannt sind – sonst wirkt ein Auto mit fehlenden Daten billiger.
  const monthlies = new Map(chosen.map((r) => [r.id, defaultMonthly(r)]));
  const common = [...monthlies.values()][0]?.lines.map((l) => l.label).filter((label) => [...monthlies.values()].every((m) => m.lines.find((l) => l.label === label)?.perMonth != null)) ?? [];
  const commonSum = (id: string) => monthlies.get(id)!.lines.filter((l) => common.includes(l.label)).reduce((s, l) => s + (l.perMonth ?? 0), 0);
  const result = chosen.length >= 2 ? compare(chosen.map((r) => ({ r, monthly: commonSum(r.id) }))) : null;
  const toggle = (id: string) => setSel(sel.includes(id) ? sel.filter((x) => x !== id) : sel.length < 3 ? [...sel, id] : sel);

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <h1 className="flex items-center gap-2 text-3xl font-semibold tracking-tight">Inserate vergleichen <ProBadge /></h1>
      <p className="mt-2 max-w-2xl text-sm text-muted-foreground">Wähle 2–3 deiner Analysen. Wir sagen dir klar, welches Auto die bessere Wahl ist – und warum.</p>

      {list && list.length < 2 && (
        <div className="mt-8 rounded-2xl border bg-card p-8 text-center">
          <p className="text-muted-foreground">Für einen Vergleich brauchst du mindestens zwei Analysen.</p>
          <Link href="/" className="mt-3 inline-flex items-center gap-1 font-medium text-brand">Weiteres Inserat analysieren <ArrowRight className="size-4" /></Link>
        </div>
      )}

      <ul className="mt-6 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {list?.map((a) => (
          <li key={a.id}>
            <label className={`flex min-h-14 cursor-pointer items-center gap-3 rounded-xl border bg-card p-3 transition-colors ${sel.includes(a.id) ? "border-brand ring-2 ring-brand/20" : ""}`}>
              <Checkbox checked={sel.includes(a.id)} onCheckedChange={() => toggle(a.id)} disabled={!sel.includes(a.id) && sel.length >= 3} />
              <span className="min-w-0">
                <span className="block truncate text-sm font-medium">{title(a)}</span>
                <span className="text-xs text-muted-foreground tabular">{a.vehicle.priceEur ? fmt(a.vehicle.priceEur) : "ohne Preis"} · Risiko {a.scores.overallRisk}</span>
              </span>
            </label>
          </li>
        ))}
      </ul>

      {result && (
        <div className="mt-8 space-y-6 animate-rise">
          <div className="rounded-2xl bg-primary p-6 text-primary-foreground sm:p-8">
            <p className="flex items-center gap-2 text-sm opacity-70"><Trophy className="size-4" /> Unsere Empfehlung</p>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">Nimm den {title(result.ranked[0].r)}</h2>
            <ul className="mt-4 space-y-1.5 text-sm opacity-90">{result.reasons.map((x) => <li key={x}>– {x}</li>)}</ul>
            <p className="mt-4 text-xs opacity-60">Rangfolge: Gesamtrisiko + 1 Punkt je 5 € Monatskosten über dem günstigsten + Abzug für schwaches Preis-Leistungs-Verhältnis. Weniger Punkte = besser.</p>
          </div>

          <div className="overflow-x-auto rounded-2xl border bg-card">
            <table className="w-full min-w-[560px] text-sm">
              <thead>
                <tr className="border-b text-left">
                  <th className="p-4 font-medium text-muted-foreground"> </th>
                  {result.ranked.map((c, i) => (
                    <th key={c.r.id} className="p-4 align-top font-semibold">
                      {i === 0 && <span className="mb-1 block text-xs font-medium text-brand">Empfehlung</span>}
                      <Link href={`/analyse/${c.r.id}`} className="hover:underline">{title(c.r)}</Link>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y tabular">
                <Row label="Preis" cells={result.ranked.map((c) => (c.r.vehicle.priceEur ? fmt(c.r.vehicle.priceEur) : "–"))} />
                <Row label="Erstzulassung / km" cells={result.ranked.map((c) => `${c.r.vehicle.firstRegistration ?? "–"} · ${c.r.vehicle.mileageKm?.toLocaleString("de-DE") ?? "–"} km`)} />
                <Row label="Gesamtrisiko" cells={result.ranked.map((c) => `${c.r.scores.overallRisk}/100`)} />
                <Row label="Empfehlung" cells={result.ranked.map((c) => (
                  <span key={c.r.id} className="inline-flex items-center gap-2"><span className={`size-2 rounded-full ${VERDICT[c.r.recommendation.verdict].dot}`} />{c.r.recommendation.verdict}</span>
                ))} />
                <Row label={`Monatskosten (verglichen: ${common.join(", ") || "–"})`} cells={result.ranked.map((c) => `ca. ${fmt(c.monthly)}`)} />
                <Row label="Fehlende Kostenangaben" cells={result.ranked.map((c) => monthlies.get(c.r.id)!.lines.filter((l) => l.perMonth === null).map((l) => l.label).join(", ") || "keine")} />
                <Row label="Preis-Leistung" cells={result.ranked.map((c) => (c.r.scores.value === null ? "keine Daten" : `${c.r.scores.value}/10`))} />
                <Row label="Schwere Schwachstellen" cells={result.ranked.map((c) => String(c.r.weakPoints.filter((w) => w.relevantNow && w.risk === "hoch").length))} />
                <Row label="Absehbare Kosten" cells={result.ranked.map((c) => (c.r.dueCosts.length ? `${fmt(c.r.dueCosts.reduce((s, d) => s + d.min, 0))}–${fmt(c.r.dueCosts.reduce((s, d) => s + d.max, 0))}` : "keine"))} />
                <Row label="Punkte (weniger = besser)" cells={result.ranked.map((c) => String(result.points(c)))} />
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

function Row({ label, cells }: { label: string; cells: React.ReactNode[] }) {
  return (
    <tr>
      <td className="p-4 text-muted-foreground">{label}</td>
      {cells.map((c, i) => <td key={i} className="p-4">{c}</td>)}
    </tr>
  );
}
