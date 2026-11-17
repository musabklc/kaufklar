import Link from "next/link";
import { KNOWLEDGE } from "@/lib/analysis/knowledge";

export const metadata = {
  title: "Schwachstellen von Motoren und Getrieben – Tachoklar",
  description: "Bekannte Probleme gängiger Gebrauchtwagen-Motoren und -Getriebe mit Reparaturkosten und Prüftipps: BMW N47, VW EA189, DSG DQ200, PureTech und mehr.",
  alternates: { canonical: "/schwachstellen" },
};

export default function SchwachstellenPage() {
  const groups = [
    ["Motoren", KNOWLEDGE.filter((e) => e.kind === "motor")],
    ["Getriebe", KNOWLEDGE.filter((e) => e.kind === "getriebe")],
  ] as const;
  return (
    <div className="mx-auto max-w-[78rem] px-4 py-10 sm:px-6 lg:py-16">
      <h1 className="text-4xl font-semibold tracking-[-0.03em] sm:text-6xl">Schwachstellen</h1>
      <p className="mt-4 max-w-2xl text-lg">Was bei diesen Motoren und Getrieben typischerweise kaputtgeht, was es kostet und woran du es vor dem Kauf erkennst.</p>
      {groups.map(([title, list]) => (
        <section key={title} className="mt-12">
          <h2 className="text-2xl font-semibold">{title}</h2>
          <ul className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {list.map((e) => (
              <li key={e.id}>
                <Link href={`/schwachstellen/${e.id}`} className="flex h-full flex-col rounded-3xl bg-card p-5 transition-transform hover:-translate-y-0.5 sm:p-6">
                  <span className="text-lg font-semibold">{e.name}</span>
                  <span className="mt-2 text-sm text-muted-foreground">{e.weakPoints.map((w) => w.title).join(" · ")}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
