"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { COMPONENTS } from "@/lib/analysis/community";

type Initial = { make?: string | null; model?: string | null; engineCode?: string | null; year?: number | null };

const selectCls = "h-11 w-full rounded-[var(--radius)] border border-input bg-card px-3 text-base outline-none focus-visible:ring-3 focus-visible:ring-ring/50 sm:text-sm";
const toInt = (s: string) => (s.replace(/\D/g, "") ? Number(s.replace(/\D/g, "")) : null);

/** Kunden melden typische Probleme. Moderation und Zusammenfassung passieren auf dem Server. */
export function ReportForm({ initial = {} }: { initial?: Initial }) {
  const [f, setF] = useState({
    make: initial.make ?? "",
    model: initial.model ?? "",
    engineCode: initial.engineCode ?? "",
    year: initial.year ? String(initial.year) : "",
    component: "Motor",
    description: "",
    mileageKm: "",
    costEur: "",
    website: "", // Spamfalle
  });
  const [state, setState] = useState<{ busy: boolean; msg: string | null; ok: boolean }>({ busy: false, msg: null, ok: false });
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => setF({ ...f, [k]: e.target.value });

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setState({ busy: true, msg: null, ok: false });
    try {
      const res = await fetch("/api/reports", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          make: f.make, model: f.model, engineCode: f.engineCode || null, year: toInt(f.year), component: f.component,
          description: f.description, mileageKm: toInt(f.mileageKm), costEur: toInt(f.costEur), website: f.website,
        }),
      });
      const data = await res.json();
      setState({ busy: false, msg: data.message ?? data.error ?? "Unbekannter Fehler.", ok: res.ok && data.status !== "rejected" });
      if (res.ok && data.status !== "rejected") setF({ ...f, description: "", mileageKm: "", costEur: "" });
    } catch {
      setState({ busy: false, msg: "Keine Verbindung. Bitte später erneut versuchen.", ok: false });
    }
  }

  const label = "flex flex-col gap-1.5 text-sm font-medium";
  return (
    <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <label className={label}>Marke<Input required className="h-11" value={f.make} onChange={set("make")} placeholder="z. B. BMW" /></label>
      <label className={label}>Modell<Input required className="h-11" value={f.model} onChange={set("model")} placeholder="z. B. 3er" /></label>
      <label className={label}>Motorcode (falls bekannt)<Input className="h-11" value={f.engineCode} onChange={set("engineCode")} placeholder="z. B. N47" /></label>
      <label className={label}>Baujahr<Input className="h-11" inputMode="numeric" value={f.year} onChange={set("year")} placeholder="z. B. 2013" /></label>
      <label className={label}>
        Betroffenes Bauteil
        <select className={selectCls} value={f.component} onChange={set("component")}>
          {COMPONENTS.map((c) => <option key={c}>{c}</option>)}
        </select>
      </label>
      <label className={label}>Kilometerstand beim Problem<Input className="h-11" inputMode="numeric" value={f.mileageKm} onChange={set("mileageKm")} placeholder="z. B. 135000" /></label>
      <label className={`${label} sm:col-span-2`}>Reparaturkosten in € (optional)<Input className="h-11" inputMode="numeric" value={f.costEur} onChange={set("costEur")} placeholder="z. B. 2400" /></label>
      <label className={`${label} sm:col-span-2 lg:col-span-4`}>
        Was war kaputt und wie hat es sich bemerkbar gemacht?
        <Textarea required minLength={15} maxLength={600} rows={4} className="text-base sm:text-sm" value={f.description} onChange={set("description")} placeholder="z. B. Rasseln beim Kaltstart, Werkstatt hat gelängte Steuerkette festgestellt und getauscht." />
        <span className="font-normal text-foreground/70">Bitte keine Namen, Telefonnummern oder Kennzeichen. Meldungen werden geprüft und erst sichtbar, wenn mehrere Personen dasselbe Problem melden.</span>
      </label>
      {/* Spamfalle: für Menschen unsichtbar */}
      <input type="text" name="website" tabIndex={-1} autoComplete="off" aria-hidden="true" className="absolute -left-[9999px] h-0 w-0" value={f.website} onChange={set("website")} />
      <div className="flex flex-col gap-3 sm:col-span-2 lg:col-span-4 sm:flex-row sm:items-center">
        <Button type="submit" size="lg" className="h-12 px-6 text-base" disabled={state.busy}>
          {state.busy ? <><Loader2 className="animate-spin" /> Wird geprüft …</> : "Problem melden"}
        </Button>
        {state.msg && <p role="status" className={state.ok ? "text-ok" : "text-bad"}>{state.msg}</p>}
      </div>
    </form>
  );
}
