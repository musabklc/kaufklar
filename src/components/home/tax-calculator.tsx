"use client";

import { useState } from "react";
import { kfzSteuer } from "@/lib/analysis/costs";
import type { Vehicle } from "@/lib/types";

const FUELS = ["Benzin", "Diesel", "Hybrid", "Elektro"] as const;

/** Live-Rechner auf der Startseite: echte Kfz-Steuer nach KraftStG aus vier Angaben des Fahrzeugscheins. */
export function TaxCalculator() {
  const [year, setYear] = useState(2018);
  const [fuel, setFuel] = useState<(typeof FUELS)[number]>("Diesel");
  const [ccm, setCcm] = useState(1968);
  const [co2, setCo2] = useState(119);
  const v = { fuel, displacementCcm: ccm || null, co2GPerKm: co2 || null } as Vehicle;
  const tax = kfzSteuer(v, new Date(year, 5, 1));

  const field = "h-12 w-full rounded-[var(--radius)] border-0 bg-white px-3 text-lg font-semibold tabular outline-none focus-visible:ring-3 focus-visible:ring-ring/40";
  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_auto] lg:items-end">
      <div className="grid grid-cols-2 gap-x-4 gap-y-5 sm:grid-cols-4">
        <label className="flex flex-col gap-2">
          <span className="text-sm font-medium">Erstzulassung (Jahr)</span>
          <input className={field} type="number" inputMode="numeric" min={1990} max={2026} value={year} onChange={(e) => setYear(Number(e.target.value))} />
        </label>
        <label className="flex flex-col gap-2">
          <span className="text-sm font-medium">Kraftstoff</span>
          <select className={field} value={fuel} onChange={(e) => setFuel(e.target.value as (typeof FUELS)[number])}>
            {FUELS.map((f) => <option key={f}>{f}</option>)}
          </select>
        </label>
        <label className="flex flex-col gap-2">
          <span className="text-sm font-medium">Hubraum in cm³ (P.1)</span>
          <input className={field} type="number" inputMode="numeric" min={0} value={ccm || ""} disabled={fuel === "Elektro"} onChange={(e) => setCcm(Number(e.target.value))} />
        </label>
        <label className="flex flex-col gap-2">
          <span className="text-sm font-medium">CO₂ in g/km (V.7)</span>
          <input className={field} type="number" inputMode="numeric" min={0} value={co2 || ""} disabled={fuel === "Elektro"} onChange={(e) => setCo2(Number(e.target.value))} />
        </label>
      </div>
      <output className="block min-w-56" aria-live="polite">
        <span className="block text-sm font-medium">Kfz-Steuer pro Jahr</span>
        <span className="block text-6xl font-bold leading-none tracking-[-0.03em] tabular sm:text-7xl">{tax.amount === null ? "–" : `${tax.amount} €`}</span>
        <span className="mt-2 block max-w-xs">{tax.note}</span>
      </output>
    </div>
  );
}
