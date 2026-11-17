"use client";

import { useState } from "react";
import Link from "next/link";
import { AlertTriangle, ExternalLink, Loader2, Search } from "lucide-react";
import type { FinderResult } from "@/app/api/finder/route";
import type { FinderInput } from "@/lib/types";

const SIZES: FinderInput["size"][] = ["Kleinwagen", "Kompakt", "Kombi", "SUV", "Van / 7 Sitze", "Limousine", "Sportlich / Coupé", "Cabrio"];
const PRIOS: FinderInput["priorities"] = ["zuverlässig", "günstig im Unterhalt", "sparsam", "komfortabel", "sportlich", "viel Platz", "modern / Assistenzsysteme"];
const eur = (n: number) => `${n.toLocaleString("de-DE")} €`;

function Chips<T extends string>({ label, options, value, onChange, multi = false }: { label: string; options: readonly T[]; value: T[]; onChange: (v: T[]) => void; multi?: boolean }) {
  return (
    <fieldset>
      <legend className="text-sm font-medium">{label}</legend>
      <div className="mt-2 flex flex-wrap gap-2">
        {options.map((o) => {
          const on = value.includes(o);
          return (
            <button
              key={o}
              type="button"
              aria-pressed={on}
              onClick={() => onChange(multi ? (on ? value.filter((x) => x !== o) : value.length < 4 ? [...value, o] : value) : [o])}
              className={`min-h-11 rounded-full border px-4 text-sm font-medium transition-colors ${on ? "border-primary bg-primary text-primary-foreground" : "border-input bg-card hover:bg-muted"}`}
            >
              {o}
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}

export function FinderForm() {
  const [input, setInput] = useState<FinderInput>({ budget: 12000, yearlyKm: "10.000–20.000", usage: "gemischt", size: "Kompakt", fuel: "egal", gearbox: "egal", priorities: ["zuverlässig"], notes: "" });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<FinderResult | null>(null);
  const set = <K extends keyof FinderInput>(k: K, v: FinderInput[K]) => setInput((i) => ({ ...i, [k]: v }));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/finder", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(input) });
      const data = await res.json();
      if (!res.ok) setError(data.error ?? "Das hat nicht geklappt.");
      else {
        setResult(data);
        requestAnimationFrame(() => document.getElementById("vorschlaege")?.scrollIntoView({ behavior: "smooth" }));
      }
    } catch {
      setError("Keine Verbindung. Bitte prüfe deine Internetverbindung.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <form onSubmit={submit} className="mt-10 space-y-6 rounded-3xl bg-card p-6 sm:p-8">
        <label className="block">
          <span className="text-sm font-medium">Budget: {eur(input.budget)}</span>
          <input type="range" min={2000} max={60000} step={500} value={input.budget} onChange={(e) => set("budget", Number(e.target.value))} className="mt-3 w-full accent-[var(--primary)]" />
        </label>
        <Chips label="Wie viel fährst du im Jahr?" options={["unter 10.000", "10.000–20.000", "über 20.000"] as const} value={[input.yearlyKm]} onChange={([v]) => set("yearlyKm", v)} />
        <Chips label="Wo fährst du meistens?" options={["Stadt", "Land", "Autobahn", "gemischt"] as const} value={[input.usage]} onChange={([v]) => set("usage", v)} />
        <Chips label="Welche Größe?" options={SIZES} value={[input.size]} onChange={([v]) => set("size", v)} />
        <div className="grid gap-6 sm:grid-cols-2">
          <Chips label="Antrieb" options={["egal", "Benzin", "Diesel", "Hybrid", "Elektro"] as const} value={[input.fuel]} onChange={([v]) => set("fuel", v)} />
          <Chips label="Getriebe" options={["egal", "Schaltgetriebe", "Automatik"] as const} value={[input.gearbox]} onChange={([v]) => set("gearbox", v)} />
        </div>
        <Chips label="Was ist dir wichtig? (bis zu 4)" options={PRIOS} value={input.priorities} onChange={(v) => set("priorities", v)} multi />
        <label className="block">
          <span className="text-sm font-medium">Sonst noch etwas? <span className="font-normal text-muted-foreground">z. B. „Hund muss rein“, „keine Franzosen“</span></span>
          <input value={input.notes} maxLength={300} onChange={(e) => set("notes", e.target.value)} className="mt-2 h-11 w-full rounded-xl border border-input bg-background px-3.5 text-base outline-none focus-visible:ring-2 focus-visible:ring-ring" />
        </label>
        <button type="submit" disabled={busy} className="inline-flex h-12 items-center gap-2 rounded-full bg-primary px-6 font-medium text-primary-foreground disabled:opacity-60">
          {busy ? <Loader2 className="size-4 animate-spin" /> : <Search className="size-4" />} {busy ? "Suche passende Autos …" : "Passende Autos finden"}
        </button>
        {error && <p role="alert" className="text-bad">{error}</p>}
      </form>

      {result && (
        <section id="vorschlaege" className="mt-10 scroll-mt-24">
          <h2 className="text-3xl font-semibold tracking-[-0.02em]">Unsere Vorschläge</h2>
          <p className="mt-3 text-lg">{result.intro}</p>
          <ol className="mt-6 space-y-4">
            {result.cars.map((c, i) => (
              <li key={`${c.make}-${c.model}-${i}`} className="rounded-3xl bg-card p-6">
                <p className="text-sm text-muted-foreground">{i + 1}. Vorschlag · {c.fuel}</p>
                <h3 className="mt-1 text-2xl font-semibold">{c.make} {c.model}</h3>
                <p className="mt-1 font-medium">{c.generation} · {c.engine}</p>
                <p className="mt-3">{c.why}</p>
                {c.watchOut.length > 0 && (
                  <div className="mt-4 rounded-2xl bg-muted/60 p-4 text-sm">
                    <p className="font-semibold">Darauf achten</p>
                    <ul className="mt-1 list-disc space-y-1 pl-5">{c.watchOut.map((w) => <li key={w}>{w}</li>)}</ul>
                  </div>
                )}
                {c.avoid && (
                  <p className="mt-3 flex gap-2 text-sm"><AlertTriangle className="mt-0.5 size-4 shrink-0 text-warn" /> Lieber meiden: {c.avoid}</p>
                )}
                <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm">
                  {c.indexMedian && <span>Marktpreis laut Tachoklar: <strong>ca. {eur(c.indexMedian)}</strong> ({c.indexCount} geprüfte Angebote)</span>}
                  {c.knowledge.map((k) => (
                    <Link key={k.id} href={`/schwachstellen/${k.id}`} className="font-medium text-brand underline-offset-4 hover:underline">Schwachstellen {k.name}</Link>
                  ))}
                  {c.searchUrl && (
                    <a href={c.searchUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 font-medium text-brand underline-offset-4 hover:underline">
                      Angebote auf Kleinanzeigen <ExternalLink className="size-3.5" />
                    </a>
                  )}
                </div>
              </li>
            ))}
          </ol>
          <p className="mt-6 rounded-3xl bg-foreground p-6 text-background">
            Ein Angebot gefunden? <Link href="/#pruefen" className="font-semibold underline">Prüf es mit Tachoklar</Link>: Schwachstellen, echter Marktpreis und Fragen an den Verkäufer.
          </p>
          <p className="mt-4 text-sm text-muted-foreground">Vorschläge einer KI auf Basis bekannter Zuverlässigkeitsdaten, keine Garantie. Preise aus echten, von Tachoklar geprüften Angeboten.</p>
        </section>
      )}
    </>
  );
}
