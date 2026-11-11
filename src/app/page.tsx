import { Suspense } from "react";
import Link from "next/link";
import { connection } from "next/server";
import { IntakeFlow } from "@/components/intake/intake-flow";
import { ProvenanceLegend } from "@/components/analysis/provenance";
import { TaxCalculator } from "@/components/home/tax-calculator";
import { aiConfigured } from "@/lib/ai/provider";
import { KNOWLEDGE } from "@/lib/analysis/knowledge";

/** Liest die Env-Flags zur Anfragezeit (nicht beim Build), der Rest der Seite bleibt statisch. */
async function Intake() {
  await connection();
  return <IntakeFlow aiEnabled={aiConfigured()} linkEnabled={process.env.LINK_IMPORT_ENABLED === "true"} />;
}

const engines = KNOWLEDGE.filter((k) => k.kind === "motor");
const gearboxes = KNOWLEDGE.filter((k) => k.kind === "getriebe");

export default function Home() {
  return (
    <>
      {/* Erster Bildschirm: Titel, ein Satz, die Eingabe – daneben ein echtes Analyse-Ergebnis als Beispiel */}
      <section className="mx-auto grid max-w-6xl gap-10 px-4 pb-16 pt-10 sm:px-6 sm:pt-16 lg:pb-24 lg:grid-cols-[1.15fr_1fr] lg:gap-14">
        <div>
          <h1 className="animate-rise text-[clamp(3rem,9vw,5.6rem)] font-bold leading-[0.9] tracking-[-0.04em] whitespace-nowrap">
            Erst prüfen.<br />Dann kaufen.
          </h1>
          <p className="animate-rise mt-8 max-w-xl text-xl leading-snug [animation-delay:80ms]">
            Link oder Screenshot vom Inserat einfügen: Kaufklar zeigt die Schwachstellen genau dieses Motors, den fairen Preis und was du den Verkäufer fragen musst.
          </p>
          <div className="animate-rise mt-8 [animation-delay:160ms]">
            <Suspense fallback={<div className="h-52 animate-pulse rounded-[var(--radius)] bg-card" />}>
              <Intake />
            </Suspense>
          </div>
        </div>
        <SampleResult />
      </section>

      {/* Behauptung 1: Wir kennen den Motor, nicht nur die Marke – Beweis: die echte Liste */}
      <section className="reveal mx-auto grid max-w-6xl gap-10 px-4 py-16 lg:py-24 sm:px-6 lg:grid-cols-[1fr_1.4fr]">
        <div>
          <h2 className="text-4xl font-bold leading-[0.95] sm:text-5xl">Wir kennen den Motor, nicht nur die Marke.</h2>
          <p className="mt-6 max-w-md text-lg">
            Ein BMW 320d von 2012 hat andere Probleme als einer von 2016. Kaufklar ordnet Motor und Getriebe zu und nennt bekannte Schwachstellen mit Reparatur-Richtwert, Kilometerstand und woran du sie bei der Besichtigung erkennst.
          </p>
          <Link href="/methodik" className="mt-6 inline-block font-semibold text-brand underline underline-offset-4">So prüfen wir</Link>
        </div>
        <div className="grid gap-10 sm:grid-cols-2">
          <List title="Motoren in der Datenbank" items={engines.map((e) => e.name)} />
          <List title="Getriebe" items={gearboxes.map((e) => e.name)} />
        </div>
      </section>

      {/* Behauptung 2: Du siehst, was das Auto wirklich kostet – Beweis: der Rechner */}
      <section className="bg-paper">
        <div className="reveal mx-auto max-w-6xl px-4 py-16 lg:py-24 sm:px-6">
          <h2 className="max-w-3xl text-4xl font-bold leading-[0.95] sm:text-5xl">Was kostet das Auto im Jahr an Steuer?</h2>
          <p className="mt-6 max-w-2xl text-lg">
            Vier Angaben aus dem Fahrzeugschein, gerechnet nach Kraftfahrzeugsteuergesetz. In jeder Analyse kommen Sprit, Wartung und absehbare Reparaturen dazu – als echte Monatskosten.
          </p>
          <div className="mt-12">
            <TaxCalculator />
          </div>
        </div>
      </section>

      {/* Behauptung 3: Preise aus echten Inseraten, und nichts wird erfunden */}
      <section className="reveal mx-auto grid max-w-6xl gap-12 px-4 py-16 lg:py-24 sm:px-6 lg:grid-cols-2">
        <div>
          <h2 className="text-4xl font-bold leading-[0.95] sm:text-5xl">Preise aus echten Inseraten.</h2>
          <p className="mt-6 max-w-lg text-lg">
            Jedes ausgelesene Inserat fließt anonym in den Kaufklar-Preisindex. Daraus ergeben sich Marktwert und fairer Preis für vergleichbare Autos – gleiches Modell, ähnliches Baujahr, ähnlicher Kilometerstand. Sind es weniger als drei Vergleiche, sagen wir das, statt zu schätzen.
          </p>
          <p className="mt-6 max-w-lg text-lg">
            Danach: Verhandlungsnachricht zum Kopieren, Besichtigungs-Checkliste, Alternativen im gleichen Budget und ein Vergleich deiner Favoriten.
          </p>
        </div>
        <div className="bg-card p-6 sm:p-8">
          <h3 className="text-2xl font-bold">Jede Aussage ist gekennzeichnet</h3>
          <p className="mt-2">So weißt du immer, was feststeht und was du vor Ort prüfen musst.</p>
          <div className="mt-6">
            <ProvenanceLegend />
          </div>
        </div>
      </section>
    </>
  );
}

function List({ title, items }: { title: string; items: string[] }) {
  return (
    <div>
      <h3 className="text-sm font-semibold text-foreground/70">{title}</h3>
      <ul className="mt-3">
        {items.map((i) => (
          <li key={i} className="border-b border-border py-2.5 text-lg font-semibold leading-tight">{i}</li>
        ))}
      </ul>
    </div>
  );
}

/** Echtes Ergebnis einer Kaufklar-Analyse (BMW 320d Touring), als Beispiel gekennzeichnet. */
function SampleResult() {
  return (
    <figure data-ui className="animate-rise self-start bg-card [animation-delay:240ms]">
      <div className="bg-paper px-5 py-4 sm:px-6">
        <p className="text-sm font-medium text-foreground/70">Beispiel einer Analyse</p>
        <p className="mt-1 text-2xl font-bold">BMW 320d Touring</p>
        <p>EZ 03/2012 · 160.000 km · 135 kW · Automatik · 9.900 €</p>
      </div>
      <div className="space-y-5 px-5 py-6 sm:px-6">
        <div className="flex items-center justify-between gap-4 bg-warn-soft px-4 py-3">
          <span className="text-lg font-bold">Nur nach genauer Prüfung</span>
          <span className="text-right text-sm"><b className="block text-2xl tabular">57</b>Risiko von 100</span>
        </div>
        <dl className="divide-y divide-border">
          <Row k="Steuerkette (BMW N47)" v="2.000 – 4.500 €" note="Risiko hoch · ab ca. 80.000 km" />
          <Row k="Getriebeölwechsel (ZF 8HP)" v="400 – 700 €" note="fällig, kein Nachweis im Inserat" />
          <Row k="Kfz-Steuer" v="210 € / Jahr" note="nach KraftStG berechnet" />
        </dl>
        <div>
          <p className="text-sm font-medium text-foreground/70">Frage an den Verkäufer</p>
          <p className="mt-1 text-lg font-semibold leading-snug">„Wurde die Steuerkette bereits erneuert? Gibt es eine Rechnung dazu?“</p>
        </div>
      </div>
      <figcaption className="sr-only">Beispielhafte Kaufklar-Analyse eines BMW 320d Touring</figcaption>
    </figure>
  );
}

function Row({ k, v, note }: { k: string; v: string; note: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4 py-3">
      <dt>
        <span className="block font-semibold">{k}</span>
        <span className="text-sm text-foreground/70">{note}</span>
      </dt>
      <dd className="shrink-0 font-bold tabular">{v}</dd>
    </div>
  );
}
