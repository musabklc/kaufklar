import { Suspense } from "react";
import { connection } from "next/server";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getGuide, listGuides } from "@/lib/server/ratgeber";
import { JsonLd } from "@/components/json-ld";
import { SITE_URL } from "@/lib/site";
import { safeHref } from "@/lib/guards";
import { boardFor } from "@/lib/forum-board";

const eur = (n: number) => `${n.toLocaleString("de-DE")} €`;
const RISK = { niedrig: "geringes Risiko", mittel: "mittleres Risiko", hoch: "hohes Risiko" } as const;
const stand = (d: string) => new Date(d).toLocaleDateString("de-DE", { month: "long", year: "numeric" });

export async function generateMetadata({ params }: PageProps<"/ratgeber/[slug]">): Promise<Metadata> {
  await connection();
  const g = await getGuide((await params).slug);
  if (!g) return { title: "Ratgeber – Tachoklar", robots: { index: false } };
  const top = g.weakPoints.slice(0, 3).map((w) => w.title).join(", ");
  return {
    title: `${g.label}: Schwachstellen & Reparaturkosten – Tachoklar`,
    description: `Typische Probleme: ${top}. Mit Reparaturkosten, ab welchem Kilometerstand und woran du es beim Gebrauchtwagenkauf erkennst.`.slice(0, 300),
    alternates: { canonical: `/ratgeber/${g.slug}` },
  };
}

export default function RatgeberPage({ params }: PageProps<"/ratgeber/[slug]">) {
  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6 lg:py-16">
      <Suspense fallback={<div className="h-96 animate-pulse rounded-3xl bg-card" />}>
        <Guide params={params} />
      </Suspense>
    </div>
  );
}

async function Guide({ params }: { params: PageProps<"/ratgeber/[slug]">["params"] }) {
  await connection();
  const g = await getGuide((await params).slug);
  if (!g) notFound();
  const make = g.label.split(" ")[0];
  const related = (await listGuides()).filter((x) => x.slug !== g.slug && x.label.split(" ")[0] === make).slice(0, 6);
  const board = boardFor(make);
  const url = `${SITE_URL}/ratgeber/${g.slug}`;
  return (
    <>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@graph": [
            {
              "@type": "BreadcrumbList",
              itemListElement: [
                { "@type": "ListItem", position: 1, name: "Tachoklar", item: SITE_URL },
                { "@type": "ListItem", position: 2, name: "Schwachstellen", item: `${SITE_URL}/schwachstellen` },
                { "@type": "ListItem", position: 3, name: g.label, item: url },
              ],
            },
            { "@type": "Article", headline: `${g.label}: Schwachstellen und Reparaturkosten`, url, inLanguage: "de-DE", dateModified: g.researchedAt, about: g.identifiedAs || g.label, publisher: { "@id": `${SITE_URL}/#org` }, citation: g.sources.map((s) => s.url).filter(Boolean) },
          ],
        }}
      />
      <Link href="/schwachstellen" className="text-sm font-medium text-brand">← Alle Ratgeber</Link>
      <h1 className="mt-3 text-4xl font-semibold tracking-[-0.03em] text-balance sm:text-5xl">{g.label}: Schwachstellen und Reparaturkosten</h1>
      {g.identifiedAs && <p className="mt-4 text-lg">{g.identifiedAs}</p>}
      <p className="mt-4 rounded-2xl bg-muted p-4 text-sm text-muted-foreground">
        Von der Tachoklar-KI aus öffentlichen Quellen recherchiert (Stand {stand(g.researchedAt)}), nicht von einer Werkstatt geprüft. Die Quellen stehen unten. Kosten sind grobe Richtwerte freier Werkstätten in Deutschland.
      </p>

      <ol className="mt-10 space-y-4">
        {g.weakPoints.map((w) => (
          <li key={w.title} className="rounded-3xl bg-card p-6">
            <h2 className="text-2xl font-semibold">{w.title}</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              {w.component} · {RISK[w.risk]}
              {w.costMinEur !== null && w.costMaxEur !== null ? ` · ${eur(w.costMinEur)}–${eur(w.costMaxEur)}` : ""}
              {w.relevantFromKm ? ` · meist ab ${w.relevantFromKm.toLocaleString("de-DE")} km` : ""}
            </p>
            <p className="mt-4 leading-relaxed">{w.detail}</p>
            {w.howToDetect && (
              <div className="mt-4 rounded-2xl bg-muted/60 p-4 text-sm">
                <p className="font-semibold">So erkennst du es</p>
                <p className="mt-1">{w.howToDetect}</p>
              </div>
            )}
          </li>
        ))}
      </ol>

      <section className="mt-10 rounded-3xl bg-foreground p-6 text-background sm:p-8">
        <h2 className="text-2xl font-semibold">Ein konkretes Inserat im Blick?</h2>
        <p className="mt-2 text-background/80">Tachoklar prüft das Auto mit diesen Schwachstellen, dem echten Marktpreis und Erfahrungen aus dem Forum, kostenlos und ohne Anmeldung.</p>
        <Link href="/#pruefen" className="mt-6 inline-flex h-12 items-center rounded-full bg-primary px-6 font-medium text-primary-foreground">Inserat prüfen</Link>
      </section>

      {related.length > 0 && (
        <section className="mt-10">
          <h2 className="text-2xl font-semibold">Weitere Ratgeber zu {make}</h2>
          <ul className="mt-4 grid gap-3 sm:grid-cols-2">
            {related.map((x) => (
              <li key={x.slug}>
                <Link href={`/ratgeber/${x.slug}`} className="block h-full rounded-3xl bg-card p-5 hover:underline">
                  <span className="font-semibold">{x.label}</span>
                  <span className="mt-1 block text-sm text-muted-foreground">{x.weakPoints.slice(0, 3).map((w) => w.title).join(" · ")}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
      {board !== "sonstige" && (
        <p className="mt-6 text-sm">
          Du fährst so ein Auto? <Link href={`/forum/${board}`} className="font-medium text-brand underline-offset-4 hover:underline">Erfahrungen im Forum teilen</Link>
        </p>
      )}

      <p className="mt-8 text-sm text-muted-foreground">
        Quellen:{" "}
        {g.sources.map((s, i) => (
          <span key={s.url ?? s.label}>
            {i > 0 && " · "}
            {safeHref(s.url) ? <a href={safeHref(s.url)} target="_blank" rel="noopener noreferrer nofollow" className="underline">{s.label}</a> : s.label}
          </span>
        ))}
      </p>
    </>
  );
}
