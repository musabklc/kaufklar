import { Suspense } from "react";
import { connection } from "next/server";
import Link from "next/link";
import { notFound } from "next/navigation";
import { currentUser } from "@/lib/supabase/server";
import { profileFlags, serviceDb } from "@/lib/server/forum-admin";
import { premiumEnabled } from "@/lib/server/payments";
import { deleteResearch } from "./actions";

export const metadata = { title: "Dashboard – Tachoklar", robots: { index: false, follow: false } };

type Stats = {
  users: number;
  new_users: number;
  analyses: number;
  analyses_with_ai: number;
  analyses_ms: number | null;
  extracts: number;
  extracts_failed: number;
  ai_calls: number;
  ai_failed: number;
  models: { model: string | null; calls: number; failed: number; input_tokens: number; output_tokens: number }[];
  paid: number;
  revenue_cents: number;
  checkouts: number;
  daily: { day: string; analyses: number; failed: number }[];
  errors: { at: string; kind: string; op: string | null; model: string | null; error: string }[];
};

const RANGES = { heute: "Heute", "7": "7 Tage", "30": "30 Tage", "365": "12 Monate" } as const;
type Range = keyof typeof RANGES;

function since(r: Range) {
  if (r !== "heute") return new Date(Date.now() - Number(r) * 864e5);
  const d = new Date(new Date().toLocaleString("en-US", { timeZone: "Europe/Berlin" }));
  return new Date(Date.now() - (d.getHours() * 3600 + d.getMinutes() * 60 + d.getSeconds()) * 1000);
}

// shortcut: ein Preis für alle Modelle (AI_EUR_PER_M_TOKENS="Eingabe/Ausgabe" in € je 1 Mio. Tokens); bei stark gemischten Modellen je Modell hinterlegen.
function aiPrice(): [number, number] | null {
  const m = process.env.AI_EUR_PER_M_TOKENS?.match(/^([\d.]+)\/([\d.]+)$/);
  return m ? [Number(m[1]), Number(m[2])] : null;
}

const n = (x: number) => x.toLocaleString("de-DE");
const eur = (x: number, digits = 2) => x.toLocaleString("de-DE", { style: "currency", currency: "EUR", minimumFractionDigits: digits, maximumFractionDigits: digits });
const pct = (a: number, b: number) => (b ? `${Math.round((a / b) * 100)} %` : "–");

export default function AdminPage({ searchParams }: PageProps<"/admin">) {
  return (
    <div className="mx-auto max-w-[78rem] px-4 py-10 sm:px-6 lg:py-16">
      <Suspense fallback={<div className="h-96 animate-pulse rounded-3xl bg-card" />}>
        <Dashboard searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

async function Dashboard({ searchParams }: { searchParams: PageProps<"/admin">["searchParams"] }) {
  await connection();
  const user = await currentUser();
  // Für alle anderen gibt es diese Seite nicht
  if (!user || !(await profileFlags(user.id)).isAdmin) notFound();
  const raw = (await searchParams).zeitraum;
  const range: Range = typeof raw === "string" && raw in RANGES ? (raw as Range) : "30";
  const db = serviceDb()!;
  const [{ data, error }, { data: research, count: researchCount }] = await Promise.all([
    db.rpc("admin_stats", { p_since: since(range).toISOString() }),
    db.from("model_research").select("key, slug, label, status, identified_as, weak_points, sources, researched_at, started_at", { count: "exact" }).order("started_at", { ascending: false }).limit(40),
  ]);
  if (error || !data) return <p className="rounded-3xl bg-card p-6">Kennzahlen konnten nicht geladen werden.</p>;
  const s = data as Stats;

  const price = aiPrice();
  const tokensIn = s.models.reduce((a, m) => a + m.input_tokens, 0);
  const tokensOut = s.models.reduce((a, m) => a + m.output_tokens, 0);
  const aiCost = price ? (tokensIn * price[0] + tokensOut * price[1]) / 1e6 : null;
  const failed = s.analyses - s.analyses_with_ai + s.extracts_failed;
  const maxDay = Math.max(1, ...s.daily.map((d) => d.analyses));

  const tiles: { label: string; value: string; note: string }[] = [
    { label: "Nutzer gesamt", value: n(s.users), note: `${n(s.new_users)} neu im Zeitraum` },
    { label: "Analysen", value: n(s.analyses), note: s.analyses_ms ? `Ø ${Math.round(s.analyses_ms / 1000)} s Dauer` : "noch keine" },
    { label: "Abgeschlossen mit KI", value: n(s.analyses_with_ai), note: `${pct(s.analyses_with_ai, s.analyses)} der Analysen` },
    { label: "Fehlerhaft", value: n(failed), note: `${n(s.analyses - s.analyses_with_ai)} ohne KI-Teil, ${n(s.extracts_failed)} Auslesen gescheitert` },
    { label: "Premium-Verkäufe", value: n(s.paid), note: premiumEnabled() ? `${n(s.checkouts)} Bezahlseiten geöffnet` : "Bezahlschranke aus" },
    { label: "Umsatz (brutto)", value: eur(s.revenue_cents / 100), note: "über Stripe, vor Gebühren" },
    { label: "KI-Kosten", value: aiCost === null ? "–" : eur(aiCost), note: aiCost === null ? "Preis je Token nicht hinterlegt (AI_EUR_PER_M_TOKENS)" : `${n(tokensIn + tokensOut)} Tokens, ${n(s.ai_calls)} Aufrufe` },
    { label: "Kosten je Analyse", value: aiCost === null || !s.analyses ? "–" : eur(aiCost / s.analyses, 4), note: "KI-Kosten ÷ Analysen (inkl. Auslesen)" },
    { label: "Conversion", value: pct(s.paid, s.analyses), note: "Verkäufe ÷ Analysen" },
  ];

  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <Link href="/forum/moderation" className="text-sm font-medium text-brand">Zur Moderation →</Link>
          <h1 className="mt-2 text-4xl font-semibold tracking-[-0.03em]">Dashboard</h1>
        </div>
        <nav aria-label="Zeitraum" className="flex gap-1 rounded-full bg-card p-1 text-sm font-medium">
          {(Object.keys(RANGES) as Range[]).map((r) => (
            <Link key={r} href={`/admin?zeitraum=${r}`} aria-current={r === range ? "page" : undefined} className={`rounded-full px-3 py-1.5 ${r === range ? "bg-foreground text-background" : "hover:bg-muted"}`}>
              {RANGES[r]}
            </Link>
          ))}
        </nav>
      </div>

      <dl className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {tiles.map((t) => (
          <div key={t.label} className="rounded-3xl bg-card p-5">
            <dt className="text-sm text-muted-foreground">{t.label}</dt>
            <dd className="mt-1 text-3xl font-bold tabular">{t.value}</dd>
            <dd className="mt-1 text-sm text-muted-foreground">{t.note}</dd>
          </div>
        ))}
      </dl>

      <section className="mt-6 rounded-3xl bg-card p-5 sm:p-6">
        <h2 className="text-lg font-semibold">Analysen pro Tag</h2>
        {s.daily.length ? (
          <ul className="mt-4 space-y-1.5">
            {s.daily.slice(-31).map((d) => (
              <li key={d.day} className="grid grid-cols-[5.5rem_1fr_4rem] items-center gap-3 text-sm">
                <span className="text-muted-foreground tabular">{new Date(d.day).toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit" })}</span>
                <span className="h-3 rounded-full bg-muted">
                  <span className="block h-3 rounded-full bg-brand" style={{ width: `${(d.analyses / maxDay) * 100}%` }} />
                </span>
                <span className="text-right tabular">{n(d.analyses)}{d.failed ? <span className="text-bad"> ·{d.failed}</span> : null}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-3 text-sm text-muted-foreground">Im Zeitraum noch keine Daten.</p>
        )}
        <p className="mt-3 text-xs text-muted-foreground">Rot: fehlerhafte Analysen bzw. gescheitertes Auslesen. Protokolliert wird seit dem 17.11.2026.</p>
      </section>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <section className="rounded-3xl bg-card p-5 sm:p-6">
          <h2 className="text-lg font-semibold">KI-Modelle</h2>
          {s.models.length ? (
            <table className="mt-4 w-full text-sm">
              <thead className="text-left text-muted-foreground">
                <tr><th className="pb-2 font-normal">Modell</th><th className="pb-2 text-right font-normal">Aufrufe</th><th className="pb-2 text-right font-normal">Fehler</th><th className="pb-2 text-right font-normal">Tokens</th></tr>
              </thead>
              <tbody className="divide-y">
                {s.models.map((m) => (
                  <tr key={m.model ?? "?"}>
                    <td className="py-2">{m.model ?? "unbekannt"}</td>
                    <td className="py-2 text-right tabular">{n(m.calls)}</td>
                    <td className="py-2 text-right tabular">{n(m.failed)}</td>
                    <td className="py-2 text-right tabular">{n(m.input_tokens + m.output_tokens)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="mt-3 text-sm text-muted-foreground">Im Zeitraum keine KI-Aufrufe.</p>
          )}
          <p className="mt-3 text-xs text-muted-foreground">Fehler = Kontingent, Zeitüberschreitung oder Störung; danach übernimmt das nächste Modell. Tagesbudget: {process.env.AI_DAILY_LIMIT || 500} Aufrufe.</p>
        </section>

        <section className="rounded-3xl bg-card p-5 sm:p-6 lg:order-last lg:col-span-2">
          <h2 className="text-lg font-semibold">Recherche-Datenbank <span className="font-normal text-muted-foreground">({n(researchCount ?? 0)} Fahrzeugtypen)</span></h2>
          <p className="mt-1 text-sm text-muted-foreground">Einmal per KI und Google-Suche recherchiert, für alle weiteren Analysen gespeichert. Löschen = beim nächsten Auto dieses Typs neu recherchieren.</p>
          {research?.length ? (
            <ul className="mt-4 divide-y text-sm">
              {research.map((r) => (
                <li key={r.key} className="flex flex-wrap items-start justify-between gap-3 py-3">
                  <div className="min-w-0 flex-1">
                    <p className="font-medium">
                      {r.identified_as ?? r.label}
                      {(r.weak_points as unknown[] | null)?.length && (r.weak_points as unknown[]).length >= 3 && (r.sources as unknown[]).length >= 2 ? (
                        <Link href={`/ratgeber/${r.slug}`} className="ml-2 text-sm font-normal text-brand">Ratgeber-Seite →</Link>
                      ) : null}
                    </p>
                    <p className="text-muted-foreground">
                      {r.status === "fertig" || r.weak_points ? `${(r.weak_points as unknown[] | null)?.length ?? 0} Schwachstellen · ${(r.sources as unknown[]).length} Quellen · ${r.researched_at ? new Date(r.researched_at).toLocaleDateString("de-DE") : ""}` : r.status === "laeuft" ? "wird gerade recherchiert …" : "fehlgeschlagen (nach 1 Stunde neuer Versuch)"}
                      {r.status !== "fertig" && r.weak_points ? ` · Erneuerung ${r.status === "laeuft" ? "läuft" : "fehlgeschlagen"}` : ""}
                    </p>
                    {(r.weak_points as { title: string }[] | null)?.length ? <p className="mt-1">{(r.weak_points as { title: string }[]).map((w) => w.title).join(" · ")}</p> : null}
                  </div>
                  <form action={deleteResearch}>
                    <input type="hidden" name="key" value={r.key} />
                    <button className="rounded-full px-3 py-1.5 font-medium text-bad hover:bg-muted">Löschen</button>
                  </form>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-3 text-sm text-muted-foreground">Noch keine Recherchen.{process.env.GEMINI_SEARCH_ENABLED === "true" ? "" : " Die Google-Suche ist aus (GEMINI_SEARCH_ENABLED) – ohne sie wird nicht recherchiert."}</p>
          )}
        </section>

        <section className="rounded-3xl bg-card p-5 sm:p-6">
          <h2 className="text-lg font-semibold">Letzte Fehler</h2>
          {s.errors.length ? (
            <ul className="mt-4 divide-y text-sm">
              {s.errors.map((e, i) => (
                <li key={i} className="py-2">
                  <p className="text-muted-foreground">
                    {new Date(e.at).toLocaleString("de-DE", { dateStyle: "short", timeStyle: "short", timeZone: "Europe/Berlin" })} · {e.kind}
                    {e.op ? ` · ${e.op}` : ""}{e.model ? ` · ${e.model}` : ""}
                  </p>
                  <p className="break-words">{e.error}</p>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-3 text-sm text-muted-foreground">Keine Fehler im Zeitraum.</p>
          )}
        </section>
      </div>
    </>
  );
}
