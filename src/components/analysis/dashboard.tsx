"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { AlertTriangle, BookOpen, Camera, CheckCircle2, ChevronDown, Info, Lock, Printer, Sparkles, Warehouse, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { buildAnalysis } from "@/lib/analysis/engine";
import { saveAnalysis, useChecked } from "@/lib/storage";
import type { AnalysisResult, Comp, Finding, Identification, WeakPoint } from "@/lib/types";
import type { ForumInsight } from "@/lib/analysis/forum-insights";
import { WatchButton } from "./watch-button";
import { InspectionResult, ServiceBookResult } from "./inspection-summary";
import { AskCommunity } from "./ask-community";
import { CompsInput } from "@/components/intake/comps-input";
import { ProvenanceBadge } from "./provenance";
import { CostsSection } from "./costs-section";
import { UnlockCard } from "./unlock-card";
import { ReportForm } from "@/components/community/report-form";
import { VehicleForm } from "@/components/intake/vehicle-form";
import type { Vehicle } from "@/lib/types";
import { parseYear } from "@/lib/analysis/knowledge";
import { FREE_WEAKPOINTS } from "@/lib/analysis/premium";
import { AlternativesSection } from "./alternatives-section";
import { safeHref } from "@/lib/guards";
import { priceVerdict } from "@/lib/analysis/market";
import { CopyButton, LevelPill, PriceGauge, RiskGauge, ScoreBar, Section, VERDICT, fmt, range } from "./parts";

const NAV = [
  ["uebersicht", "Übersicht"],
  ["schwachstellen", "Schwachstellen"],
  ["forum", "Forum"],
  ["inserat", "Inserat-Check"],
  ["rueckrufe", "Rückrufe"],
  ["preis", "Preis"],
  ["kosten", "Monatskosten"],
  ["alternativen", "Alternativen"],
  ["besichtigung", "Besichtigung"],
  ["fragen", "Fragen"],
  ["probefahrt", "Probefahrt"],
  ["verhandlung", "Verhandlung"],
  ["fazit", "Fazit"],
] as const;

// In der kostenlosen Fassung sichtbar; alles andere steckt im Premium-Bericht
const FREE_SECTIONS = new Set(["uebersicht", "schwachstellen", "forum", "inserat", "rueckrufe", "kosten"]);

export function Dashboard({ r }: { r: AnalysisResult }) {
  const v = r.vehicle;
  const locked = Boolean(r.locked);
  const nav = locked ? [...NAV.filter(([id]) => FREE_SECTIONS.has(id)), ["premium", "Premium-Bericht"] as const] : NAV;
  const name = [v.make, v.model, v.variant].filter(Boolean).join(" ");
  const facts = [
    v.firstRegistration && `EZ ${v.firstRegistration}`,
    v.mileageKm !== null && `${v.mileageKm.toLocaleString("de-DE")} km`,
    v.powerKw !== null && `${v.powerKw} kW (${Math.round(v.powerKw * 1.36)} PS)`,
    v.fuel,
    v.transmission,
    v.sellerType && `Verkauf ${v.sellerType}`,
    v.location,
  ].filter(Boolean) as string[];

  function updateComps(user: number[]) {
    const comps: Comp[] = [...r.price.comps.filter((c) => c.source !== "nutzer"), ...user.map((price) => ({ price, source: "nutzer" as const }))];
    const next = { ...buildAnalysis({ id: r.id, vehicle: r.vehicle, comps, ai: r.ai, aiNote: r.aiNote, alternatives: r.alternatives, dataNotes: r.dataNotes, recalls: r.recalls, community: r.community, research: r.research, now: new Date(r.createdAt) }), forum: r.forum, inspection: r.inspection, serviceBook: r.serviceBook, locked: r.locked };
    saveAnalysis(next); // Speicher-Hook rendert die Seite mit den neuen Werten
  }

  return (
    <div className="mx-auto max-w-[78rem] px-4 pb-24 pt-6 sm:px-6 sm:pt-10">
      {/* Kopf */}
      <div className="animate-rise">
        <p className="text-sm text-muted-foreground">Analyse vom {new Date(r.createdAt).toLocaleDateString("de-DE")}</p>
        <div className="mt-1 flex flex-wrap items-end justify-between gap-4">
          <h1 className="text-3xl font-bold leading-none tracking-[-0.03em] text-balance sm:text-6xl">{name || "Fahrzeug"}</h1>
          {v.priceEur !== null && <p className="text-3xl font-bold tabular sm:text-5xl">{fmt(v.priceEur)}</p>}
        </div>
        <p className="mt-3 text-lg text-foreground/75">{facts.join(" · ")}</p>
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <WatchButton r={r} />
          <AskCommunity r={r} />
          <Link href={`/analyse/${r.id}/besichtigung`} className="no-print inline-flex min-h-11 items-center gap-2 rounded-full border border-input bg-card px-4 text-sm font-medium hover:bg-muted">
            <Camera className="size-4" /> Besichtigung starten
          </Link>
          <Link
            href={`/garage?${new URLSearchParams({ titel: [v.make, v.model, v.variant].filter(Boolean).join(" ").slice(0, 80), jahr: String(parseYear(v.firstRegistration) ?? ""), km: String(v.mileageKm ?? "") })}`}
            className="no-print inline-flex min-h-11 items-center gap-2 rounded-full px-4 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <Warehouse className="size-4" /> Gekauft? In die Garage
          </Link>
        </div>
        <EditVehicle r={r} />
        {r.dataNotes.map((n) => (
          <p key={n} className="mt-4 flex items-start gap-2 rounded-2xl bg-card p-3 text-sm">
            <Info className="mt-0.5 size-4 shrink-0" /> {n}
          </p>
        ))}
        {r.aiNote && (
          <p className="mt-4 flex items-start gap-2 rounded-xl bg-muted p-3 text-sm text-muted-foreground">
            <Info className="mt-0.5 size-4 shrink-0" /> {r.aiNote}
          </p>
        )}
      </div>

      {/* Sektionsnavigation */}
      <nav aria-label="Abschnitte" className="no-print sticky top-16 z-30 -mx-4 mt-6 border-b bg-background px-4 sm:-mx-6 sm:px-6">
        <ul className="flex gap-1 overflow-x-auto py-2 [scrollbar-width:none]">
          {nav.map(([id, label]) => (
            <li key={id}>
              <a href={`#${id}`} className="block whitespace-nowrap rounded-full px-3 py-1.5 text-sm font-medium text-foreground/80 hover:bg-muted hover:text-foreground">{label}</a>
            </li>
          ))}
        </ul>
      </nav>

      <div className="mt-6 space-y-6">
        {!locked && <PriceCheck r={r} />}
        <Overview r={r} />
        <WeakPoints items={r.weakPoints} knowledge={r.matchedKnowledge} identification={r.identification} locked={locked} />
        {locked && <UnlockCard r={r} />}
        <ForumSection items={r.forum ?? []} vehicle={r.vehicle} />
        {(r.inspection || r.serviceBook) && (
          <Section id="besichtigung-ergebnis" eyebrow="Vor Ort" title="Ergebnis deiner Besichtigung">
            <div className="space-y-8">
              {r.inspection && <InspectionResult i={r.inspection} />}
              {r.serviceBook && (
                <div>
                  <h3 className="mb-3 text-lg font-semibold">Scheckheft</h3>
                  <ServiceBookResult b={r.serviceBook} />
                </div>
              )}
              <Link href={`/analyse/${r.id}/besichtigung`} className="inline-block font-medium text-brand underline-offset-4 hover:underline">Weitere Fotos prüfen</Link>
            </div>
          </Section>
        )}
        <Findings items={r.findings} />
        <RecallsSection r={r} />
        {!locked && <PriceSection r={r} onComps={updateComps} />}
        <CostsSection r={r} />
        {!locked && (
        <>
        <AlternativesSection r={r} />
        <Checklist r={r} />
        <Section id="fragen" eyebrow="Vor dem Termin" title="Fragen an den Verkäufer" action={<CopyButton label="Fragen kopieren" text={r.questions.map((q, i) => `${i + 1}. ${q}`).join("\n")} />}>
          <ol className="divide-y">
            {r.questions.map((q, i) => (
              <li key={q} className="flex gap-3 py-3 text-sm">
                <span className="w-5 shrink-0 text-right font-medium text-muted-foreground tabular">{i + 1}.</span>
                {q}
              </li>
            ))}
          </ol>
        </Section>
        <Section id="probefahrt" eyebrow="Unterwegs" title="Probefahrt-Leitfaden">
          <div className="grid gap-6 md:grid-cols-2">
            {r.testDrive.map((s) => (
              <div key={s.title}>
                <h3 className="font-medium">{s.title}</h3>
                <ul className="mt-2 space-y-2">
                  {s.points.map((p) => (
                    <li key={p.text} className="flex gap-2.5 text-sm">
                      <span className={`mt-1.5 size-1.5 shrink-0 rounded-full ${p.specific ? "bg-brand" : "bg-border"}`} />
                      <span>{p.text}{p.specific && <span className="ml-1.5 text-xs font-medium text-brand">fahrzeugspezifisch</span>}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </Section>
        <NegotiationSection r={r} />
        <Summary r={r} />
        </>
        )}
        <Section id="melden" title="Kennst du dieses Modell?">
          <p className="mb-6 max-w-3xl">Hattest du selbst Probleme mit einem {name || "solchen Auto"}? Melde sie – so wird Tachoklar mit jedem Nutzer genauer.</p>
          <ReportForm initial={{ make: v.make, model: v.model, engineCode: v.engineCode, year: parseYear(v.firstRegistration) }} />
        </Section>
        <div className="no-print flex justify-center">
          <Button variant="outline" size="lg" className="h-11" onClick={() => window.print()}>
            <Printer /> Drucken / als PDF speichern
          </Button>
        </div>
      </div>
    </div>
  );
}

/** Marktcheck ganz oben: Tacho + Urteil; Details im Abschnitt „Preis“. */
function PriceCheck({ r }: { r: AnalysisResult }) {
  const p = r.price;
  const verdict = priceVerdict(p.asking, p.marketEstimate);
  const pct = verdict && p.asking && p.marketEstimate ? Math.round((p.asking / p.marketEstimate - 1) * 100) : null;
  const color = { ok: "text-ok", warn: "text-warn", bad: "text-bad" };
  return (
    <section aria-label="Marktcheck" className="grid items-center gap-6 rounded-3xl bg-card p-6 sm:grid-cols-[16rem_1fr] sm:p-8">
      <div className="mx-auto w-full max-w-64">
        <PriceGauge pct={pct} />
      </div>
      <div>
        <p className="text-sm font-medium text-muted-foreground">Marktcheck</p>
        {verdict ? (
          <>
            <p className={`mt-1 text-3xl font-bold tracking-tight sm:text-4xl ${color[verdict.tone]}`}>{verdict.label}</p>
            <p className="mt-2 text-foreground/80">{verdict.detail}</p>
            <p className="mt-3 text-sm text-muted-foreground">
              Angebot <b className="text-foreground">{fmt(p.asking!)}</b> · Marktschnitt <b className="text-foreground">{fmt(p.marketEstimate!)}</b> · aus {p.comps.length} geprüften Vergleichsangeboten ·{" "}
              <a href="#preis" className="font-medium text-brand underline underline-offset-4">Details</a>
            </p>
          </>
        ) : (
          <>
            <p className="mt-1 text-2xl font-bold tracking-tight">{p.asking === null ? "Kein Preis angegeben" : "Noch zu wenig Vergleichsangebote"}</p>
            <p className="mt-2 text-foreground/80">
              {p.asking === null ? "Trag den Preis aus dem Inserat ein, dann ordnen wir ihn ein." : `Gefunden: ${p.comps.length} von mindestens 3. Ohne genug echte Angebote nennen wir bewusst keinen Marktwert.`}
            </p>
            <a href="#preis" className="mt-3 inline-block text-sm font-medium text-brand underline underline-offset-4">Vergleichspreise selbst ergänzen</a>
          </>
        )}
      </div>
    </section>
  );
}

function Overview({ r }: { r: AnalysisResult }) {
  const s = r.scores;
  const vd = VERDICT[r.recommendation.verdict];
  const [open, setOpen] = useState(false);
  return (
    <section id="uebersicht" className="grid gap-6 lg:grid-cols-[1.1fr_1fr]">
      {r.ai?.expertSummary && (
        <div className="rounded-3xl bg-foreground p-6 text-background sm:p-8 lg:col-span-2">
          <p className="flex items-center gap-2 text-sm font-medium opacity-70">Einschätzung unseres KI-Gutachters <span className="rounded-full bg-background/15 px-2 py-0.5 text-xs">KI-Einschätzung</span></p>
          <p className="mt-3 max-w-4xl text-xl leading-snug sm:text-2xl">{r.ai.expertSummary}</p>
        </div>
      )}
      <div className={`flex flex-col justify-between p-6 sm:p-8 ${vd.cls}`}>
        <div>
          <p className="text-sm font-medium text-foreground/70">Kaufempfehlung</p>
          <h2 className="mt-2 flex items-center gap-3 text-2xl font-semibold tracking-tight sm:text-3xl">
            <span className={`size-3 rounded-full ${vd.dot}`} /> {r.recommendation.verdict}
          </h2>
          <ul className="mt-5 space-y-2.5">
            {r.recommendation.reasons.map((x) => (
              <li key={x} className="flex gap-2.5 text-sm">
                <ChevronDown className="mt-0.5 size-4 shrink-0 -rotate-90 text-muted-foreground" /> {x}
              </li>
            ))}
          </ul>
        </div>
        <p className="mt-6 text-xs text-muted-foreground">Die Empfehlung berücksichtigt den Score, aber auch einzelne kritische Punkte. Sie ersetzt keine Fachbegutachtung.</p>
      </div>
      <div className="rounded-3xl bg-card p-6 sm:p-8">
        <RiskGauge value={s.overallRisk} />
        {r.dataQuality && r.dataQuality.level !== "gut" && (
          <p className={`mt-4 flex gap-2 rounded-xl p-3 text-sm ${r.dataQuality.level === "gering" ? "bg-warn-soft" : "bg-muted"}`}>
            <Info className="mt-0.5 size-4 shrink-0" />
            <span>
              <span className="font-medium">Aussagekraft: {r.dataQuality.level}.</span> {r.dataQuality.reasons.join(", ")}.
              {r.dataQuality.level === "gering" && " Die Werte sind eine grobe Orientierung – kläre zuerst die offenen Punkte mit dem Verkäufer."}
            </span>
          </p>
        )}
        <div className="mt-6 grid gap-5 sm:grid-cols-2">
          <ScoreBar label="Fahrzeugzustand" value={s.condition} hint="aus Inseratsdaten geschätzt" />
          <ScoreBar label="Preis-Leistung" value={s.value} hint={s.value === null ? "keine Vergleichsdaten" : "vs. Vergleichsangebote"} />
          <ScoreBar label="Technische Zuverlässigkeit" value={10 - s.techRisk} hint="10 = kaum bekannte Risiken" />
          <ScoreBar label="Inserat-Transparenz" value={s.transparency} hint="Vollständigkeit & Plausibilität" />
        </div>
        <button onClick={() => setOpen(!open)} aria-expanded={open} className="mt-6 flex items-center gap-1.5 text-sm font-medium text-brand">
          So entsteht der Score <ChevronDown className={`size-4 transition-transform ${open ? "rotate-180" : ""}`} />
        </button>
        {open && (
          <table className="mt-3 w-full text-sm">
            <tbody className="divide-y">
              {s.breakdown.map((b) => (
                <tr key={b.label}>
                  <td className="py-2 pr-3"><div className="font-medium">{b.label}</div><div className="text-xs text-muted-foreground">{b.note}</div></td>
                  <td className="py-2 text-right font-semibold tabular">+{b.points}</td>
                </tr>
              ))}
              <tr><td className="py-2 font-medium">Gesamtrisiko</td><td className="py-2 text-right font-semibold tabular">{s.overallRisk}</td></tr>
            </tbody>
          </table>
        )}
      </div>
    </section>
  );
}

function WeakPointCard({ w, locked }: { w: WeakPoint; locked: boolean }) {
  return (
    <li className="grid gap-x-8 gap-y-3 border-b border-border py-6 first:pt-0 last:border-0 sm:grid-cols-[1fr_auto]">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="mr-1 text-xl font-bold">{w.title}</h3>
          <LevelPill level={w.risk} />
          <ProvenanceBadge p={w.provenance} />
        </div>
        <p className="mt-1 text-sm text-foreground/70">{w.component} · {w.origin}{w.relevantFromKm ? ` · relevant ab ca. ${w.relevantFromKm.toLocaleString("de-DE")} km` : ""}</p>
        <p className="mt-3 max-w-3xl">{w.detail}</p>
        {!locked && <p className="mt-2 max-w-3xl"><span className="font-semibold">So erkennst du es:</span> {w.detection}</p>}
        {!locked && w.sources?.length ? (
          <p className="mt-2 text-sm text-foreground/70">
            Quellen der Recherche:{" "}
            {w.sources.map((s, i) => (
              <span key={s.url ?? s.label}>
                {i > 0 && " · "}
                {safeHref(s.url) ? <a href={safeHref(s.url)} target="_blank" rel="noopener noreferrer nofollow" className="text-brand underline-offset-4 hover:underline">{s.label}</a> : s.label}
              </span>
            ))}
          </p>
        ) : null}
      </div>
      <div className="sm:text-right">
        {locked ? (
          <a href="#premium" className="inline-flex items-center gap-1.5 text-sm font-medium text-brand"><Lock className="size-4" /> Kosten im Premium-Bericht</a>
        ) : (
          <>
            <p className="text-2xl font-bold tabular sm:text-3xl">{range(w.costMin, w.costMax)}</p>
            <p className="text-sm text-foreground/70">Reparatur, Richtwert*</p>
          </>
        )}
      </div>
    </li>
  );
}

const CERTAINTY: Record<Identification["certainty"], string> = { angegeben: "bg-ok-soft text-ok", wahrscheinlich: "bg-brand/10 text-brand", unklar: "bg-warn-soft text-warn" };

function WeakPoints({ items: all, knowledge, identification, locked }: { items: WeakPoint[]; knowledge: AnalysisResult["matchedKnowledge"]; identification?: Identification[]; locked: boolean }) {
  // Kostenlos: nur die ersten Punkte, ohne Kosten (auch nach einer Neuberechnung im Browser)
  const items = locked ? all.slice(0, FREE_WEAKPOINTS).map((w) => ({ ...w, costMin: null, costMax: null, detection: "" })) : all;
  const now = items.filter((w) => w.relevantNow);
  const later = items.filter((w) => !w.relevantNow);
  return (
    <Section id="schwachstellen" eyebrow="Technik" title="Schwachstellen & Reparaturkosten">
      {identification && (
        <dl className="mb-5 grid gap-2 sm:grid-cols-2">
          {identification.map((i) => (
            <div key={i.part} className="rounded-xl bg-accent/60 p-3 text-sm">
              <dt className="flex items-center justify-between gap-2 text-muted-foreground">
                {i.part}
                <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${CERTAINTY[i.certainty]}`}>{i.certainty}</span>
              </dt>
              <dd className="mt-1 font-medium">{i.label}</dd>
              <dd className="mt-1 text-muted-foreground">{i.basis}</dd>
            </div>
          ))}
        </dl>
      )}
      {identification ? null : knowledge.length ? (
        <div className="mb-5 space-y-2">
          {knowledge.map((k) => (
            <div key={k.name} className="flex gap-3 rounded-xl bg-accent/60 p-3 text-sm">
              <BookOpen className="mt-0.5 size-4 shrink-0 text-brand" />
              <div>
                <p className="font-medium">{k.name}</p>
                <p className="text-muted-foreground">{k.matchNote} Exakten Motor-/Getriebecode bitte über Fahrzeugschein oder FIN bestätigen.</p>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="mb-5 flex gap-2 rounded-xl bg-muted p-3 text-sm text-muted-foreground">
          <Info className="mt-0.5 size-4 shrink-0" /> Für dieses Fahrzeug gibt es noch keinen Eintrag in unserer Wissensdatenbank. Angezeigt werden allgemeine Verschleißpunkte{items.some((w) => w.provenance === "ki") ? " und KI-Einschätzungen" : ""}. Ergänze Hubraum und Baujahr für eine genauere Zuordnung.
        </p>
      )}
      {now.length ? <ul>{now.map((w) => <WeakPointCard key={w.id} w={w} locked={locked} />)}</ul> : <p className="text-sm text-muted-foreground">Keine bei diesem Kilometerstand relevanten Schwachstellen bekannt.</p>}
      {later.length > 0 && (
        <details className="mt-4 rounded-xl border p-4">
          <summary className="cursor-pointer text-sm font-medium">Bei diesem km-Stand noch nicht relevant ({later.length})</summary>
          <ul className="mt-4">{later.map((w) => <WeakPointCard key={w.id} w={w} locked={locked} />)}</ul>
        </details>
      )}
      <p className="mt-4 text-xs text-muted-foreground">* Unverbindliche Richtwerte für eine freie Werkstatt in Deutschland inkl. Teile. Tatsächliche Kosten können deutlich abweichen.</p>
    </Section>
  );
}

function ForumSection({ items, vehicle }: { items: ForumInsight[]; vehicle: Vehicle }) {
  const weak = items.filter((i) => i.kind === "schwachstelle");
  const plus = items.filter((i) => i.kind === "pluspunkt");
  const car = [vehicle.make, vehicle.model].filter(Boolean).join(" ");
  const column = (title: string, list: ForumInsight[], icon: React.ReactNode, empty: string) => (
    <div>
      <h3 className="flex items-center gap-2 font-semibold">{icon} {title}</h3>
      {list.length ? (
        <ul className="mt-3 space-y-3">
          {list.map((i) => (
            <li key={i.title} className="rounded-2xl bg-muted/60 p-4">
              <p className="font-medium">{i.title}</p>
              <p className="mt-1 text-sm text-muted-foreground">
                {i.people} {i.people === 1 ? "Erfahrungsbericht" : "Erfahrungsberichte"} · {i.component}
                {i.typicalKm ? ` · um ${fmt(i.typicalKm)} km` : ""}
                {i.medianCost ? ` · ca. ${fmt(i.medianCost)} €` : ""}
              </p>
              <p className="mt-2 flex flex-wrap gap-x-3 text-sm">
                {i.posts.map((p, n) => (
                  <Link key={p.postId} href={`/forum/thema/${p.threadId}#b${p.postId}`} className="font-medium text-brand underline-offset-4 hover:underline">
                    Beitrag {n + 1} lesen
                  </Link>
                ))}
              </p>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-3 text-sm text-muted-foreground">{empty}</p>
      )}
    </div>
  );
  return (
    <Section id="forum" eyebrow="Community" title="Aus dem Forum">
      {items.length ? (
        <div className="grid gap-6 md:grid-cols-2 *:min-w-0">
          {column("Schwachstellen", weak, <AlertTriangle className="size-4 text-warn" />, "Keine Probleme gemeldet.")}
          {column("Pluspunkte", plus, <CheckCircle2 className="size-4 text-ok" />, "Noch keine positiven Erfahrungen berichtet.")}
        </div>
      ) : (
        <p className="text-muted-foreground">Im Forum hat noch niemand über {car || "dieses Modell"} berichtet.</p>
      )}
      <p className="mt-5 text-sm text-muted-foreground">
        Automatisch von einer KI aus Forumsbeiträgen gelesen; Einzelerfahrungen, keine Statistik.{" "}
        <Link href="/forum" className="font-medium text-brand underline-offset-4 hover:underline">Fährst du so ein Auto? Erzähl im Forum davon.</Link>
      </p>
    </Section>
  );
}

const STATUS: Record<Finding["status"], { label: string; icon: typeof CheckCircle2; cls: string }> = {
  bestaetigt: { label: "Tatsache", icon: CheckCircle2, cls: "text-foreground" },
  verdacht: { label: "Verdachtsmoment", icon: AlertTriangle, cls: "text-warn" },
  pruefen: { label: "Noch zu prüfen", icon: Info, cls: "text-brand" },
};

function Findings({ items }: { items: Finding[] }) {
  return (
    <Section id="inserat" eyebrow="Wie ein Händler prüft" title="Auffälligkeiten im Inserat">
      {items.length === 0 ? (
        <p className="text-sm text-muted-foreground">Keine Auffälligkeiten gefunden. Das ersetzt nicht den Blick vor Ort.</p>
      ) : (
        <ul className="divide-y">
          {items.map((f) => {
            const st = STATUS[f.status];
            return (
              <li key={f.title + f.evidence} className="flex gap-3 py-4 first:pt-0 last:pb-0">
                <st.icon className={`mt-0.5 size-5 shrink-0 ${st.cls}`} />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="mr-auto font-medium">{f.title}</h3>
                    <LevelPill level={f.severity} prefix="Gewicht" />
                    <ProvenanceBadge p={f.provenance} />
                  </div>
                  <p className="mt-1 text-sm">{f.detail}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{st.label} · Grundlage: {f.evidence}</p>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </Section>
  );
}

/** Angaben im Ergebnis korrigieren: rechnet sofort neu (Wissensdatenbank, Regeln, Kosten) – ohne neuen KI-Aufruf. */
function EditVehicle({ r }: { r: AnalysisResult }) {
  const [draft, setDraft] = useState<Vehicle>(r.vehicle);
  const [open, setOpen] = useState(false);
  return (
    <div className="no-print mt-3">
      <button onClick={() => setOpen(!open)} aria-expanded={open} className="font-semibold text-brand underline underline-offset-4">
        {open ? "Korrektur schließen" : "Angaben falsch oder unvollständig? Korrigieren"}
      </button>
      {open && (
        <div className="mt-4 rounded-3xl bg-card p-5 sm:p-7">
          <VehicleForm value={draft} onChange={setDraft} />
          <Button
            size="lg"
            className="mt-5 h-12 px-6 text-base"
            onClick={() => {
              saveAnalysis({ ...buildAnalysis({ id: r.id, vehicle: draft, comps: r.price.comps, ai: r.ai, aiNote: r.aiNote, alternatives: r.alternatives, dataNotes: r.dataNotes, recalls: r.recalls, community: r.community, research: r.research, now: new Date(r.createdAt) }), forum: r.forum, inspection: r.inspection, serviceBook: r.serviceBook, locked: r.locked });
              setOpen(false);
            }}
          >
            Neu berechnen
          </Button>
        </div>
      )}
    </div>
  );
}

function RecallsSection({ r }: { r: AnalysisResult }) {
  return (
    <Section id="rueckrufe" title="Offizielle EU-Rückrufe">
      {r.recalls.length === 0 ? (
        <p className="max-w-3xl">
          In der EU-Rückrufdatenbank Safety Gate haben wir keinen passenden Pkw-Rückruf gefunden. Rückrufe können trotzdem existieren – lass sie dir beim Markenhändler per Fahrgestellnummer (FIN) bestätigen.
        </p>
      ) : (
        <ul>
          {r.recalls.map((c) => (
            <li key={c.case_number} className="grid gap-x-8 gap-y-2 border-b border-border py-5 first:pt-0 last:border-0 sm:grid-cols-[1fr_auto]">
              <div className="min-w-0">
                <h3 className="text-lg font-bold">{c.brand} {c.name}</h3>
                <p className="mt-1 text-sm text-foreground/70">
                  {c.production_dates ? `Produktion ${c.production_dates} · ` : ""}zugeordnet über {c.matchedBy}{c.risk_type ? ` · Risiko: ${c.risk_type}` : ""}
                </p>
                {c.danger && <p className="mt-2 max-w-3xl">{c.danger}</p>}
              </div>
              <div className="text-sm sm:text-right">
                <p className="font-semibold tabular">{c.published ? new Date(c.published).toLocaleDateString("de-DE") : ""}</p>
                {safeHref(c.url) && <a href={safeHref(c.url)} target="_blank" rel="noopener noreferrer" className="font-semibold text-brand underline underline-offset-4">Fall {c.case_number}</a>}
              </div>
            </li>
          ))}
        </ul>
      )}
      <p className="mt-4 text-xs text-foreground/70">Quelle: EU Safety Gate, Europäische Kommission (CC BY 4.0). Ob ein Rückruf an diesem Fahrzeug erledigt wurde, weiß nur der Hersteller – per FIN prüfen lassen.</p>
    </Section>
  );
}

function PriceSection({ r, onComps }: { r: AnalysisResult; onComps: (c: number[]) => void }) {
  const p = r.price;
  const [edit, setEdit] = useState(false);
  const prices = p.comps.map((c) => c.price);
  const linked = p.comps.filter((c) => safeHref(c.url));
  const pts = [...prices, ...(p.asking ? [p.asking] : [])];
  const lo = Math.min(...pts) * 0.95;
  const hi = Math.max(...pts) * 1.05;
  const pos = (x: number) => `${((x - lo) / (hi - lo)) * 100}%`;
  const due = r.dueCosts.reduce((s, c) => [s[0] + c.min, s[1] + c.max], [0, 0]);
  return (
    <Section id="preis" eyebrow="Markt" title="Preisbewertung" action={<Button variant="outline" size="lg" className="h-10" onClick={() => setEdit(!edit)}>{edit ? "Fertig" : "Vergleichspreise bearbeiten"}</Button>}>
      <div className="grid gap-3 sm:grid-cols-3">
        <Stat label="Angebotspreis" value={p.asking !== null ? fmt(p.asking) : "nicht angegeben"} />
        <Stat label="Geschätzter Marktwert" value={p.marketEstimate !== null ? fmt(p.marketEstimate) : "keine Datenbasis"} muted={p.marketEstimate === null} />
        <Stat label="Fairer Kaufpreis" value={p.fairMin !== null ? range(p.fairMin, p.fairMax) : "keine Datenbasis"} muted={p.fairMin === null} />
      </div>
      {p.comps.length >= 3 && p.asking !== null && (
        <div className="mt-6 px-2">
          <div className="relative h-10">
            <div className="absolute inset-x-0 top-1/2 h-1 -translate-y-1/2 rounded-full bg-muted" />
            {p.fairMin !== null && p.fairMax !== null && (
              <div className="absolute top-1/2 h-1 -translate-y-1/2 rounded-full bg-ok/50" style={{ left: pos(Math.max(lo, p.fairMin)), width: `calc(${pos(p.fairMax)} - ${pos(Math.max(lo, p.fairMin))})` }} />
            )}
            {prices.map((c, i) => <span key={i} title={fmt(c)} className="absolute top-1/2 size-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-muted-foreground/60" style={{ left: pos(c) }} />)}
            <span className="absolute top-1/2 h-6 w-1 -translate-x-1/2 -translate-y-1/2 rounded-full bg-brand" style={{ left: pos(p.asking) }} />
          </div>
          <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5"><span className="h-3 w-1 rounded bg-brand" /> Angebot</span>
            <span className="flex items-center gap-1.5"><span className="size-2 rounded-full bg-muted-foreground/60" /> Vergleichsangebote</span>
            <span className="flex items-center gap-1.5"><span className="h-1 w-4 rounded bg-ok/50" /> fairer Bereich</span>
          </div>
        </div>
      )}
      <p className="mt-5 text-sm text-muted-foreground">{p.note}</p>
      {linked.length > 0 && (
        <details className="mt-4 rounded-xl border p-4">
          <summary className="cursor-pointer text-sm font-medium">Vergleichsangebote ansehen ({linked.length})</summary>
          <ul className="mt-3 divide-y text-sm">
            {linked.map((c) => (
              <li key={c.url} className="flex items-center justify-between gap-3 py-2">
                <a href={c.url} target="_blank" rel="noopener noreferrer nofollow" className="min-w-0 truncate text-brand hover:underline">{c.label || new URL(c.url!).hostname}</a>
                <span className="flex shrink-0 items-center gap-2">
                  {c.seller && <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">{c.seller === "privat" ? "Privat" : "Händler"}</span>}
                  <span className="tabular">{fmt(c.price)}</span>
                </span>
              </li>
            ))}
          </ul>
          <p className="mt-2 text-xs text-muted-foreground">Angebote können inzwischen verkauft oder geändert sein.</p>
        </details>
      )}
      {r.dueCosts.length > 0 && (
        <div className="mt-5 rounded-xl border p-4">
          <h3 className="text-sm font-medium">Absehbare Zusatzkosten nach dem Kauf: {range(due[0], due[1])}</h3>
          <ul className="mt-2 space-y-1.5 text-sm">
            {r.dueCosts.map((c) => <li key={c.title} className="flex justify-between gap-3"><span>{c.title} <span className="text-muted-foreground">– {c.reason}</span></span><span className="shrink-0 tabular">{range(c.min, c.max)}</span></li>)}
          </ul>
        </div>
      )}
      {edit && <CompsInput value={p.comps.filter((c) => c.source === "nutzer").map((c) => c.price)} onChange={onComps} />}
    </Section>
  );
}

function Stat({ label, value, muted }: { label: string; value: string; muted?: boolean }) {
  return (
    <div className="rounded-xl bg-muted/70 p-4">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className={`mt-1 text-lg font-semibold tabular ${muted ? "text-muted-foreground" : ""}`}>{value}</div>
    </div>
  );
}

function Checklist({ r }: { r: AnalysisResult }) {
  const [checked, setChecked] = useChecked(r.id);
  const total = r.checklist.reduce((s, c) => s + c.items.length, 0);
  const toggle = (id: string) => {
    setChecked(checked.includes(id) ? checked.filter((x) => x !== id) : [...checked, id]);
  };
  return (
    <Section id="besichtigung" eyebrow="Vor Ort" title="Besichtigungs-Checkliste" action={<span className="text-sm text-muted-foreground tabular">{checked.length}/{total} erledigt</span>}>
      <div className="mb-5 h-1.5 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-ok transition-[width]" style={{ width: `${(checked.length / Math.max(1, total)) * 100}%` }} /></div>
      <div className="grid gap-6 md:grid-cols-2">
        {r.checklist.map((sec) => (
          <div key={sec.area}>
            <h3 className="font-medium">{sec.area}</h3>
            <ul className="mt-2 space-y-1">
              {sec.items.map((it) => (
                <li key={it.id}>
                  <label className="flex min-h-11 cursor-pointer items-start gap-3 rounded-lg px-2 py-2 hover:bg-muted/60">
                    <Checkbox checked={checked.includes(it.id)} onCheckedChange={() => toggle(it.id)} className="mt-0.5" />
                    <span className={`text-sm ${checked.includes(it.id) ? "text-muted-foreground line-through" : ""}`}>
                      {it.text}
                      {it.specific && <span className="ml-1.5 text-xs font-medium text-brand no-underline">speziell</span>}
                    </span>
                  </label>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </Section>
  );
}

function NegotiationSection({ r }: { r: AnalysisResult }) {
  const n = r.negotiation;
  if (!n)
    return (
      <Section id="verhandlung" eyebrow="Preis" title="Verhandlungsassistent">
        <p className="text-sm text-muted-foreground">Für eine Verhandlungsstrategie fehlt der Angebotspreis. Ergänze ihn über eine neue Analyse.</p>
      </Section>
    );
  return (
    <Section id="verhandlung" eyebrow="Preis" title="Verhandlungsassistent">
      <div className="grid gap-3 sm:grid-cols-3">
        <Stat label="Einstiegsangebot" value={fmt(n.entry)} />
        <div className="rounded-xl bg-primary p-4 text-primary-foreground">
          <div className="text-xs opacity-70">Realistischer Zielpreis</div>
          <div className="mt-1 text-lg font-semibold tabular">{fmt(n.target)}</div>
        </div>
        <Stat label="Obergrenze (Orientierung)" value={fmt(n.ceiling)} />
      </div>
      <h3 className="mt-6 font-medium">Deine Argumente</h3>
      <ul className="mt-2 space-y-2">
        {n.arguments.map((a) => <li key={a} className="flex gap-2.5 text-sm"><span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-brand" />{a}</li>)}
      </ul>
      <MessageEditor key={n.message} initial={n.message} />
      <p className="mt-3 text-xs text-muted-foreground">Preise sind Orientierungswerte aus den erkannten Kosten{r.price.marketEstimate ? " und deinen Vergleichspreisen" : ""}. Bleib freundlich und sachlich – Argumente wirken besser als Druck.</p>
    </Section>
  );
}

function MessageEditor({ initial }: { initial: string }) {
  const [msg, setMsg] = useState(initial);
  return (
    <>
      <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
        <h3 className="font-medium">Nachricht an den Verkäufer</h3>
        <CopyButton label="Nachricht kopieren" text={msg} />
      </div>
      <Textarea value={msg} onChange={(e) => setMsg(e.target.value)} rows={14} className="mt-3 text-base leading-relaxed sm:text-sm" aria-label="Nachricht an den Verkäufer" />
    </>
  );
}

function Summary({ r }: { r: AnalysisResult }) {
  const due = useMemo(() => r.dueCosts.reduce((s, c) => [s[0] + c.min, s[1] + c.max], [0, 0]), [r.dueCosts]);
  const risks = r.weakPoints.filter((w) => w.relevantNow && w.risk !== "niedrig");
  const fair = r.price.fairMin !== null ? range(r.price.fairMin, r.price.fairMax) : r.negotiation ? `ca. ${fmt(r.negotiation.target)} (Zielpreis, ohne Marktdaten)` : "nicht bewertbar";
  const vd = VERDICT[r.recommendation.verdict];
  return (
    <Section id="fazit" eyebrow="Zusammenfassung" title="Kaufentscheidung">
      <div className="grid gap-4 md:grid-cols-2">
        <List title="Was spricht dafür?" icon={<CheckCircle2 className="size-4 text-ok" />} items={r.summary.pros} empty="Keine klaren Pluspunkte aus den Daten ableitbar." />
        <List title="Was spricht dagegen?" icon={<XCircle className="size-4 text-bad" />} items={r.summary.cons} empty="Keine klaren Minuspunkte erkannt." />
        <List title="Welche Risiken bestehen?" icon={<AlertTriangle className="size-4 text-warn" />} items={risks.map((w) => `${w.title} (${range(w.costMin, w.costMax)})`)} empty="Keine erhöhten technischen Risiken bekannt." />
        <List title="Vor dem Kauf unbedingt prüfen" icon={<Sparkles className="size-4 text-brand" />} items={r.summary.mustCheck} empty="Standard-Checkliste abarbeiten." />
      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <Stat label="Mögliche Zusatzkosten (absehbar)" value={due[1] ? range(due[0], due[1]) : "keine konkret absehbar"} />
        <Stat label="Angemessener Preis" value={fair} />
      </div>
      <div className={`mt-4 flex items-center gap-3 rounded-xl p-4 ${vd.cls}`}>
        <span className={`size-3 rounded-full ${vd.dot}`} />
        <p className="font-semibold">Finale Empfehlung: {r.recommendation.verdict}</p>
      </div>
    </Section>
  );
}

function List({ title, icon, items, empty }: { title: string; icon: React.ReactNode; items: string[]; empty: string }) {
  return (
    <div className="rounded-xl border p-4">
      <h3 className="flex items-center gap-2 font-medium">{icon} {title}</h3>
      {items.length ? (
        <ul className="mt-2 space-y-1.5 text-sm">{items.map((x) => <li key={x}>{x}</li>)}</ul>
      ) : (
        <p className="mt-2 text-sm text-muted-foreground">{empty}</p>
      )}
    </div>
  );
}
