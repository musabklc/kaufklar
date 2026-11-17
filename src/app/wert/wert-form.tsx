"use client";

import { useState } from "react";
import { ExternalLink, Loader2 } from "lucide-react";
import type { WertResult } from "@/app/api/wert/route";

const eur = (n: number) => `${n.toLocaleString("de-DE")} €`;
const FUELS = ["Benzin", "Diesel", "Hybrid", "Plug-in-Hybrid", "Elektro", "LPG"] as const;
const field = "mt-2 h-11 w-full rounded-xl border border-input bg-background px-3.5 text-base outline-none focus-visible:ring-2 focus-visible:ring-ring";

export function WertForm() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<WertResult | null>(null);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const num = (k: string) => Number(String(f.get(k) ?? "").replace(/\D/g, ""));
    setBusy(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch("/api/wert", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ make: f.get("make"), model: f.get("model"), variant: f.get("variant"), year: num("year"), mileageKm: num("km"), fuel: f.get("fuel") || null }),
      });
      const data = await res.json();
      if (!res.ok) setError(data.error ?? "Das hat nicht geklappt.");
      else setResult(data);
    } catch {
      setError("Keine Verbindung. Bitte prüfe deine Internetverbindung.");
    } finally {
      setBusy(false);
    }
  }

  const v = result?.valuation;
  return (
    <>
      <form onSubmit={submit} className="mt-10 grid gap-4 rounded-3xl bg-card p-6 sm:grid-cols-2 sm:p-8">
        <label className="text-sm font-medium">Marke<input name="make" required placeholder="z. B. VW" className={field} /></label>
        <label className="text-sm font-medium">Modell<input name="model" required placeholder="z. B. Golf" className={field} /></label>
        <label className="text-sm font-medium">Motor/Variante <span className="font-normal text-muted-foreground">(optional)</span><input name="variant" placeholder="z. B. 2.0 TDI" className={field} /></label>
        <label className="text-sm font-medium">
          Kraftstoff
          <select name="fuel" className={field} defaultValue="">
            <option value="">egal</option>
            {FUELS.map((x) => <option key={x}>{x}</option>)}
          </select>
        </label>
        <label className="text-sm font-medium">Baujahr<input name="year" required inputMode="numeric" placeholder="z. B. 2016" className={field} /></label>
        <label className="text-sm font-medium">Kilometerstand<input name="km" required inputMode="numeric" placeholder="z. B. 140000" className={field} /></label>
        <div className="sm:col-span-2">
          <button type="submit" disabled={busy} className="inline-flex h-12 items-center gap-2 rounded-full bg-primary px-6 font-medium text-primary-foreground disabled:opacity-60">
            {busy && <Loader2 className="size-4 animate-spin" />} {busy ? "Suche Vergleichsangebote …" : "Wert ermitteln"}
          </button>
          {error && <p role="alert" className="mt-3 text-bad">{error}</p>}
        </div>
      </form>

      {result && !v && <p className="mt-8 rounded-3xl bg-card p-6">Zu wenige vergleichbare Angebote gefunden. Versuch es ohne Motorvariante oder prüf die Schreibweise von Marke und Modell.</p>}
      {v && (
        <section className="mt-10">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-3xl bg-foreground p-6 text-background">
              <p className="text-sm text-background/70">Privat verkaufen, realistisch</p>
              <p className="mt-2 text-4xl font-semibold">{eur(v.privateSale[0])} – {eur(v.privateSale[1])}</p>
              <p className="mt-2 text-sm text-background/70">Inserieren würde ich für ca. {eur(v.median)}; verhandelt wird fast immer.</p>
            </div>
            <div className="rounded-3xl bg-card p-6">
              <p className="text-sm text-muted-foreground">An einen Händler</p>
              <p className="mt-2 text-4xl font-semibold">{eur(v.dealer[0])} – {eur(v.dealer[1])}</p>
              <p className="mt-2 text-sm text-muted-foreground">Händler kalkulieren Aufbereitung, Garantie und Gewinn ein.</p>
            </div>
          </div>
          <p className="mt-4 text-sm text-muted-foreground">
            Aus {v.count} vergleichbaren Angeboten (mittlere Hälfte {eur(v.low)} – {eur(v.high)}). Zustand, Ausstattung und Scheckheft verschieben den Preis spürbar.
          </p>
          <h2 className="mt-10 text-2xl font-semibold">Vergleichsangebote</h2>
          <ul className="mt-4 space-y-2">
            {result.comps.map((c, i) => (
              <li key={`${c.url}-${i}`} className="flex items-center justify-between gap-4 rounded-2xl bg-card px-5 py-3">
                <span className="min-w-0 truncate">{c.label}{c.seller ? ` · ${c.seller === "privat" ? "Privat" : "Händler"}` : ""}</span>
                <span className="flex shrink-0 items-center gap-3 font-semibold">
                  {eur(c.price)}
                  {c.url && <a href={c.url} target="_blank" rel="noopener noreferrer" aria-label="Inserat öffnen" className="text-brand"><ExternalLink className="size-4" /></a>}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </>
  );
}
