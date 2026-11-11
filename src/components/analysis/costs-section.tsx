"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { defaultCostInputs, monthlyCosts, type CostInputs } from "@/lib/analysis/costs";
import { parseMonthYear } from "@/lib/analysis/engine";
import type { AnalysisResult } from "@/lib/types";
import { Section, fmt } from "./parts";

export function ageOf(r: AnalysisResult) {
  const ez = parseMonthYear(r.vehicle.firstRegistration);
  return { ez, age: ez ? (new Date(r.createdAt).getTime() - ez.getTime()) / (365.25 * 864e5) : null };
}

/** Monatskosten mit Standardannahmen – auch für den Inserate-Vergleich. */
export function defaultMonthly(r: AnalysisResult) {
  const { ez, age } = ageOf(r);
  return monthlyCosts(r.vehicle, ez, defaultCostInputs(r.vehicle, age), r.dueCosts);
}

export function CostsSection({ r }: { r: AnalysisResult }) {
  const { ez, age } = ageOf(r);
  const [inp, setInp] = useState<CostInputs>(() => defaultCostInputs(r.vehicle, age));
  const [extra, setExtra] = useState({ co2GPerKm: r.vehicle.co2GPerKm, consumptionPer100km: r.vehicle.consumptionPer100km });
  const m = monthlyCosts({ ...r.vehicle, ...extra }, ez, inp, r.dueCosts);
  const unit = r.vehicle.fuel === "Elektro" ? "kWh" : "l";
  const field = (label: string, key: keyof CostInputs, step = 1) => (
    <label className="flex flex-col gap-1.5 text-sm">
      <span className="font-medium">{label}</span>
      <Input
        type="number"
        inputMode="decimal"
        step={step}
        min={0}
        className="h-11 text-base sm:text-sm"
        value={inp[key] ?? ""}
        placeholder={key === "insurancePerYear" ? "z. B. 650" : undefined}
        onChange={(e) => setInp({ ...inp, [key]: e.target.value === "" ? (key === "insurancePerYear" ? null : 0) : Number(e.target.value) })}
      />
    </label>
  );
  return (
    <Section id="kosten" eyebrow="Unterhalt" title="Was kostet dich das Auto wirklich?">
      <div className="grid gap-6 lg:grid-cols-[1fr_1.2fr]">
        <div className="flex flex-col justify-center rounded-2xl bg-primary p-6 text-primary-foreground">
          <p className="text-sm opacity-70">Laufende Kosten pro Monat</p>
          <p className="mt-1 text-4xl font-semibold tracking-tight tabular">{m.total ? `ca. ${fmt(m.total)}` : "–"}</p>
          <p className="mt-2 text-sm opacity-70">
            {m.complete ? "Ohne Wertverlust und Finanzierung." : "Noch unvollständig – fehlende Posten unten ergänzen. Ohne Wertverlust und Finanzierung."}
          </p>
        </div>
        <ul className="divide-y">
          {m.lines.map((l) => (
            <li key={l.label} className="flex items-start justify-between gap-4 py-3">
              <div className="min-w-0">
                <p className="text-sm font-medium">{l.label}</p>
                <p className="text-xs text-muted-foreground">{l.note}</p>
              </div>
              <span className={`shrink-0 text-sm font-semibold tabular ${l.perMonth === null ? "text-muted-foreground" : ""}`}>{l.perMonth === null ? "fehlt" : `${fmt(l.perMonth)}/Mon.`}</span>
            </li>
          ))}
        </ul>
      </div>
      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {field("Kilometer pro Jahr", "kmPerYear", 1000)}
        {field(`Preis pro ${unit} in €`, "fuelPrice", 0.01)}
        {field("Versicherung pro Jahr in €", "insurancePerYear", 10)}
        {field("Wartung & Verschleiß pro Jahr in €", "maintenancePerYear", 50)}
        {r.vehicle.co2GPerKm === null && r.vehicle.fuel !== "Elektro" && (
          <label className="flex flex-col gap-1.5 text-sm">
            <span className="font-medium">CO₂ in g/km (Fahrzeugschein V.7)</span>
            <Input type="number" inputMode="numeric" min={0} className="h-11 text-base sm:text-sm" value={extra.co2GPerKm ?? ""} onChange={(e) => setExtra({ ...extra, co2GPerKm: e.target.value ? Number(e.target.value) : null })} />
          </label>
        )}
        {r.vehicle.consumptionPer100km === null && (
          <label className="flex flex-col gap-1.5 text-sm">
            <span className="font-medium">Verbrauch {unit}/100 km</span>
            <Input type="number" inputMode="decimal" step={0.1} min={0} className="h-11 text-base sm:text-sm" value={extra.consumptionPer100km ?? ""} onChange={(e) => setExtra({ ...extra, consumptionPer100km: e.target.value ? Number(e.target.value) : null })} />
          </label>
        )}
      </div>
      <p className="mt-4 text-xs text-muted-foreground">
        Kfz-Steuer exakt nach Kraftfahrzeugsteuergesetz berechnet. Kraftstoffpreis und Wartungs-Faustwert sind Annahmen und anpassbar. Den Versicherungsbeitrag kannst du über ein Vergleichsportal ermitteln.
      </p>
    </Section>
  );
}
