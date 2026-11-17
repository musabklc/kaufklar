import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { KNOWLEDGE } from "@/lib/analysis/knowledge";
import { SITE_URL } from "@/lib/site";
import { JsonLd } from "@/components/json-ld";
import { boardFor } from "@/lib/forum-board";

export const generateStaticParams = () => KNOWLEDGE.map((e) => ({ id: e.id }));

const entry = (id: string) => KNOWLEDGE.find((e) => e.id === id);
const eur = (n: number) => `${n.toLocaleString("de-DE")} €`;
const RISK = { niedrig: "geringes Risiko", mittel: "mittleres Risiko", hoch: "hohes Risiko" } as const;

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const e = entry((await params).id);
  if (!e) return {};
  const top = e.weakPoints.slice(0, 3).map((w) => w.title).join(", ");
  return {
    title: `${e.name}: Schwachstellen & Reparaturkosten – Tachoklar`,
    description: `Typische Probleme beim ${e.name}: ${top}. Mit Kosten, ab welchem Kilometerstand und woran du es bei der Besichtigung erkennst.`,
    alternates: { canonical: `${SITE_URL}/schwachstellen/${e.id}` },
  };
}

export default async function SchwachstellePage({ params }: { params: Promise<{ id: string }> }) {
  const e = entry((await params).id);
  if (!e) notFound();
  const brand = e.name.split(" ")[0];
  // Verwandte Ratgeber: zuerst gleiche Marke/Konzern, dann gleiche Art (Motor/Getriebe)
  const related = [...KNOWLEDGE.filter((x) => x.id !== e.id && x.name.split(" ")[0] === brand), ...KNOWLEDGE.filter((x) => x.id !== e.id && x.kind === e.kind && x.name.split(" ")[0] !== brand)].slice(0, 6);
  const board = boardFor(brand.replace(/-Konzern$/, ""));
  const url = `${SITE_URL}/schwachstellen/${e.id}`;
  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6 lg:py-16">
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@graph": [
            {
              "@type": "BreadcrumbList",
              itemListElement: [
                { "@type": "ListItem", position: 1, name: "Tachoklar", item: SITE_URL },
                { "@type": "ListItem", position: 2, name: "Schwachstellen", item: `${SITE_URL}/schwachstellen` },
                { "@type": "ListItem", position: 3, name: e.name, item: url },
              ],
            },
            {
              "@type": "Article",
              headline: `${e.name}: Schwachstellen und Reparaturkosten`,
              url,
              inLanguage: "de-DE",
              about: e.name,
              publisher: { "@id": `${SITE_URL}/#org` },
              citation: e.sources.filter((s) => s.url).map((s) => s.url),
            },
          ],
        }}
      />
      <Link href="/schwachstellen" className="text-sm font-medium text-brand">← Alle Motoren und Getriebe</Link>
      <h1 className="mt-3 text-4xl font-semibold tracking-[-0.03em] text-balance sm:text-5xl">{e.name}: Schwachstellen und Reparaturkosten</h1>
      <p className="mt-4 text-lg">{e.matchNote}</p>

      <ol className="mt-10 space-y-4">
        {e.weakPoints.map((w) => (
          <li key={w.id} className="rounded-3xl bg-card p-6">
            <h2 className="text-2xl font-semibold">{w.title}</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              {w.component} · {RISK[w.risk]} · {eur(w.costMin)}–{eur(w.costMax)}
              {w.relevantFromKm ? ` · meist ab ${w.relevantFromKm.toLocaleString("de-DE")} km` : ""}
            </p>
            <p className="mt-4 leading-relaxed">{w.detail}</p>
            <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
              <div className="rounded-2xl bg-muted/60 p-4">
                <dt className="font-semibold">So erkennst du es</dt>
                <dd className="mt-1">{w.detection}</dd>
              </div>
              {(w.check || w.testDrive || w.question) && (
                <div className="rounded-2xl bg-muted/60 p-4">
                  <dt className="font-semibold">Bei der Besichtigung</dt>
                  <dd className="mt-1">{[w.check, w.testDrive, w.question && `Frag den Verkäufer: ${w.question}`].filter(Boolean).join(" ")}</dd>
                </div>
              )}
            </dl>
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
          <h2 className="text-2xl font-semibold">Weitere Ratgeber</h2>
          <ul className="mt-4 grid gap-3 sm:grid-cols-2">
            {related.map((x) => (
              <li key={x.id}>
                <Link href={`/schwachstellen/${x.id}`} className="block h-full rounded-3xl bg-card p-5 hover:underline">
                  <span className="font-semibold">{x.name}</span>
                  <span className="mt-1 block text-sm text-muted-foreground">{x.weakPoints.slice(0, 3).map((w) => w.title).join(" · ")}</span>
                </Link>
              </li>
            ))}
          </ul>
          {board !== "sonstige" && (
            <p className="mt-4 text-sm">
              Selbst so einen Motor oder so ein Getriebe gefahren? <Link href={`/forum/${board}`} className="font-medium text-brand underline-offset-4 hover:underline">Erfahrungen im Forum teilen</Link>
            </p>
          )}
        </section>
      )}

      {e.sources.length > 0 && (
        <p className="mt-8 text-sm text-muted-foreground">
          Quellen: {e.sources.map((s, i) => <span key={s.url}>{i > 0 && " · "}<a href={s.url} rel="noopener noreferrer" target="_blank" className="underline">{s.label}</a></span>)}. Kosten: unverbindliche Richtwerte freier Werkstätten in Deutschland.
        </p>
      )}
    </div>
  );
}
