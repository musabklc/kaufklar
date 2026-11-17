import { Suspense } from "react";
import Image from "next/image";
import Link from "next/link";
import { connection } from "next/server";
import { IntakeFlow } from "@/components/intake/intake-flow";
import { ProvenanceLegend } from "@/components/analysis/provenance";
import { PriceGauge } from "@/components/analysis/parts";
import { TaxCalculator } from "@/components/home/tax-calculator";
import { aiConfigured } from "@/lib/ai/provider";
import { KNOWLEDGE } from "@/lib/analysis/knowledge";
import { forumEnabled, supabaseUser } from "@/lib/supabase/server";

/** Liest die Env-Flags zur Anfragezeit (nicht beim Build), der Rest der Seite bleibt statisch. */
async function Intake({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  await connection();
  const link = (await searchParams).link;
  // Geteilter Link ("Teilen → Tachoklar"): nur https, wird sofort ausgelesen
  const initialUrl = typeof link === "string" && /^https:\/\//.test(link) ? link.slice(0, 2000) : "";
  return <IntakeFlow aiEnabled={aiConfigured()} linkEnabled={process.env.LINK_IMPORT_ENABLED === "true"} initialUrl={initialUrl} />;
}

const engines = KNOWLEDGE.filter((k) => k.kind === "motor");
const gearboxes = KNOWLEDGE.filter((k) => k.kind === "getriebe");

// Echte Vergleichsangebote aus der Tachoklar-Analyse eines CLS 500 (Kleinanzeigen, Preise im Inserat geprüft, Nov. 2026).
const CLS_COMPS = [
  { title: "CLS 500 C219, V8 388 PS", detail: "2008 · Privat", price: "12.000 €" },
  { title: "CLS 500 AMG-Paket, MB-Service", detail: "2009 · Privat", price: "10.999 €" },
  { title: "CLS 500 Facelift, LPG-Anlage", detail: "2008 · Privat", price: "7.999 €" },
];

export default function Home({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  return (
    <>
      {/* Erster Bildschirm: Titel, ein Satz, die Eingabe – daneben ein echtes Auto mit seinem echten Ergebnis */}
      <section id="pruefen" className="mx-auto grid *:min-w-0 max-w-[78rem] scroll-mt-20 items-center gap-10 px-4 pb-20 pt-8 sm:px-6 sm:pt-14 lg:grid-cols-[1fr_1.05fr] lg:gap-14 lg:pb-28">
        <div>
          <h1 className="animate-rise text-[clamp(2.6rem,6.2vw,4.75rem)] font-semibold leading-[0.98] tracking-[-0.035em] text-balance">
            Gebrauchtwagen? Erst prüfen.
          </h1>
          <p className="animate-rise mt-6 max-w-xl text-xl leading-snug text-foreground/85 [animation-delay:80ms]">
            Link oder Screenshot vom Inserat einfügen. In einer Minute siehst du die Schwachstellen des Motors, den echten Marktpreis und was du den Verkäufer fragen musst.
          </p>
          <div className="animate-rise mt-8 [animation-delay:160ms]">
            <Suspense fallback={<div className="h-52 animate-pulse rounded-2xl bg-card" />}>
              <Intake searchParams={searchParams} />
            </Suspense>
          </div>
          <p className="mt-4 text-sm text-muted-foreground">Kostenlos, ohne Anmeldung. Für AutoScout24, Kleinanzeigen und mobile.de.</p>
        </div>
        <HeroCar />
      </section>

      {/* Behauptung 1: Der Preis wird an echten, geprüften Angeboten gemessen */}
      <section className="bg-card">
        <div className="mx-auto grid *:min-w-0 max-w-[78rem] items-center gap-12 px-4 py-20 sm:px-6 lg:grid-cols-2 lg:py-28">
          <div>
            <h2 className="text-4xl font-semibold leading-[1.02] tracking-[-0.03em] sm:text-5xl">Der Preis, gemessen an echten Angeboten.</h2>
            <p className="mt-6 max-w-lg text-lg">
              Bei jeder Analyse sucht Tachoklar live nach vergleichbaren Autos: gleiches Modell, ähnliches Baujahr, ähnlicher Kilometerstand. Jedes gefundene Inserat wird geöffnet und der Preis direkt dort abgelesen. Was sich nicht prüfen lässt, zählt nicht.
            </p>
            <p className="mt-4 max-w-lg text-lg">Am Ende steht ein klares Urteil: gut eingepreist, zu teuer oder auffällig günstig.</p>
          </div>
          <figure data-ui className="rounded-3xl bg-background p-6 sm:p-8">
            <p className="text-sm font-medium text-muted-foreground">Vergleichsangebote · Mercedes CLS 500</p>
            <ul className="mt-4 space-y-3">
              {CLS_COMPS.map((c) => (
                <li key={c.title} className="flex items-center justify-between gap-4 rounded-2xl bg-card px-5 py-4 transition-transform hover:-translate-y-0.5">
                  <span className="min-w-0">
                    <span className="block truncate font-semibold">{c.title}</span>
                    <span className="text-sm text-muted-foreground">{c.detail} · Preis im Inserat geprüft</span>
                  </span>
                  <span className="shrink-0 text-lg font-semibold tabular">{c.price}</span>
                </li>
              ))}
            </ul>
            <p className="mt-5 flex items-baseline justify-between gap-4 px-1">
              <span className="text-muted-foreground">Marktschnitt</span>
              <span className="text-2xl font-semibold tabular">11.000 €</span>
            </p>
            <figcaption className="sr-only">Echte Vergleichsangebote aus einer Tachoklar-Analyse</figcaption>
          </figure>
        </div>
      </section>

      {/* Behauptung 2: Wir kennen den Motor, nicht nur die Marke – Beweis: Motorraum und die echte Liste */}
      <section className="mx-auto grid *:min-w-0 max-w-[78rem] items-center gap-12 px-4 py-20 sm:px-6 lg:grid-cols-[1.1fr_1fr] lg:py-28">
        <div className="overflow-hidden rounded-3xl">
          <Image
            src="/img/photo-f37734507.webp"
            alt="Motorraum eines 2.0 TDI"
            width={1280}
            height={790}
            sizes="(max-width: 1023px) 100vw, 640px"
            className="aspect-[4/3] w-full object-cover transition-transform duration-700 hover:scale-[1.03]"
          />
        </div>
        <div>
          <h2 className="text-4xl font-semibold leading-[1.02] tracking-[-0.03em] sm:text-5xl">Wir kennen den Motor, nicht nur die Marke.</h2>
          <p className="mt-6 max-w-md text-lg">
            Ein BMW 320d von 2012 hat andere Probleme als einer von 2016. Tachoklar ordnet Motor und Getriebe zu und nennt Schwachstellen mit Reparaturkosten und woran du sie bei der Besichtigung erkennst. Für jedes andere Modell recherchiert die KI die bekannten Probleme.
          </p>
          <div className="mt-8 grid gap-8 sm:grid-cols-2">
            <List title="Motoren in der Datenbank" items={engines} />
            <List title="Getriebe" items={gearboxes} />
          </div>
          <Link href="/methodik" className="mt-8 inline-block font-semibold text-brand underline-offset-4 hover:underline">So prüfen wir</Link>
        </div>
      </section>

      {/* Behauptung 3: Du siehst, was das Auto wirklich kostet – Beweis: der Rechner */}
      <section className="bg-card">
        <div className="mx-auto max-w-[78rem] px-4 py-20 sm:px-6 lg:py-28">
          <h2 className="max-w-3xl text-4xl font-semibold leading-[1.02] tracking-[-0.03em] sm:text-5xl">Was kostet das Auto im Jahr an Steuer?</h2>
          <p className="mt-6 max-w-2xl text-lg">
            Vier Angaben aus dem Fahrzeugschein, gerechnet nach Kraftfahrzeugsteuergesetz. In jeder Analyse kommen Sprit, Wartung und absehbare Reparaturen dazu, als echte Monatskosten.
          </p>
          <div className="mt-12">
            <TaxCalculator />
          </div>
        </div>
      </section>

      {/* Behauptung 4: Nichts wird erfunden – jede Aussage ist gekennzeichnet */}
      <section className="mx-auto grid *:min-w-0 max-w-[78rem] items-center gap-12 px-4 py-20 sm:px-6 lg:grid-cols-2 lg:py-28">
        <div>
          <h2 className="text-4xl font-semibold leading-[1.02] tracking-[-0.03em] sm:text-5xl">Jede Aussage ist gekennzeichnet.</h2>
          <p className="mt-6 max-w-lg text-lg">
            Du siehst immer, was feststeht, was typisch für das Modell ist und was du vor Ort prüfen musst. Danach: Verhandlungsnachricht zum Kopieren, Besichtigungs-Checkliste, Alternativen im gleichen Budget und ein Vergleich deiner Favoriten.
          </p>
        </div>
        <div className="rounded-3xl bg-card p-6 sm:p-8">
          <ProvenanceLegend />
        </div>
      </section>

      {/* Behauptung 5: Echte Fahrer helfen – Beweis: die neuesten Forenthemen */}
      <section className="bg-card">
        <div className="mx-auto grid *:min-w-0 max-w-[78rem] items-start gap-12 px-4 py-20 sm:px-6 lg:grid-cols-2 lg:py-28">
          <div>
            <h2 className="text-4xl font-semibold leading-[1.02] tracking-[-0.03em] sm:text-5xl">Frag Leute, die das Auto fahren.</h2>
            <p className="mt-6 max-w-lg text-lg">
              Im Forum erzählen Fahrer, was bei ihrem Auto kaputtgegangen ist und was es gekostet hat. Diese Erfahrungen fließen automatisch in jede passende Analyse ein, unter „Aus dem Forum“.
            </p>
            <Link href="/forum" className="mt-8 inline-flex h-12 items-center rounded-full bg-primary px-6 font-medium text-primary-foreground">Zum Forum</Link>
          </div>
          <Suspense fallback={<div className="h-64 animate-pulse rounded-3xl bg-background" />}>
            <LatestThreads />
          </Suspense>
        </div>
      </section>
    </>
  );
}

/** Neueste Forenthemen (zur Anfragezeit, der Rest der Startseite bleibt statisch). */
async function LatestThreads() {
  await connection();
  if (!forumEnabled()) return null;
  const sb = await supabaseUser();
  const { data } = await sb.from("forum_threads").select("id, title, post_count, board:forum_boards(title)").order("last_post_at", { ascending: false }).limit(5);
  if (!data?.length)
    return <p className="rounded-3xl bg-background p-6 text-lg">Noch ist es ruhig. <Link href="/forum" className="font-medium text-brand underline">Stell die erste Frage</Link> zu deinem Auto.</p>;
  return (
    <ul className="space-y-3">
      {data.map((t) => (
        <li key={t.id}>
          <Link href={`/forum/thema/${t.id}`} className="block rounded-2xl bg-background px-5 py-4 transition-transform hover:-translate-y-0.5">
            <span className="font-semibold">{t.title}</span>
            <span className="mt-1 block text-sm text-muted-foreground">
              {(t.board as unknown as { title: string } | null)?.title} · {t.post_count} {t.post_count === 1 ? "Beitrag" : "Beiträge"}
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}

function List({ title, items }: { title: string; items: { id: string; name: string }[] }) {
  return (
    <div>
      <h3 className="text-sm font-medium text-muted-foreground">{title}</h3>
      <ul className="mt-3 space-y-2">
        {items.map((i) => (
          <li key={i.id} className="font-medium leading-snug">
            <Link href={`/schwachstellen/${i.id}`} className="underline-offset-4 hover:text-brand hover:underline">{i.name}</Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Echtes Auto, echtes Ergebnis: die Tachoklar-Analyse eines CLS 500 (Nov. 2026) als schwebende Karte über dem Foto. */
function HeroCar() {
  return (
    <div className="animate-rise relative pb-28 [animation-delay:200ms] sm:pb-20">
      <div className="overflow-hidden rounded-3xl">
        <Image
          src="/img/cls-hero-1560.webp"
          alt="Schwarzer Mercedes CLS 500 auf der Straße"
          width={1560}
          height={780}
          priority
          sizes="(max-width: 1023px) 100vw, 680px"
          className="aspect-[4/3] w-full object-cover"
        />
      </div>
      <figure data-ui className="absolute bottom-0 left-4 right-4 rounded-2xl bg-card p-5 shadow-[0_24px_60px_-20px_rgba(11,12,14,0.35)] sm:left-auto sm:right-6 sm:w-[22rem]">
        <p className="text-sm text-muted-foreground">Mercedes CLS 500 · 2008 · 168.000 km</p>
        <div className="mt-3 flex items-center gap-4">
          <div className="w-28 shrink-0">
            <PriceGauge pct={-27} />
          </div>
          <div>
            <p className="text-xl font-semibold leading-tight text-warn">Auffällig günstig</p>
            <p className="mt-1 text-sm">8.000 € statt Marktschnitt 11.000 €</p>
          </div>
        </div>
        <p className="mt-4 rounded-xl bg-background px-4 py-3 text-sm">
          <span className="font-semibold">Getriebe-Steuerplatte</span> · 600–1.500 € · bei der Probefahrt alle Gänge durchschalten
        </p>
        <figcaption className="sr-only">Beispiel einer echten Tachoklar-Analyse</figcaption>
      </figure>
    </div>
  );
}
