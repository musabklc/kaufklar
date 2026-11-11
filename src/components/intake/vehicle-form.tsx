"use client";

import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { Vehicle } from "@/lib/types";

export const EMPTY_VEHICLE: Vehicle = {
  make: null, model: null, variant: null, firstRegistration: null, mileageKm: null, powerKw: null,
  displacementCcm: null, engineCode: null, fuel: null, transmission: null, transmissionDetail: null,
  priceEur: null, co2GPerKm: null, consumptionPer100km: null, sellerType: null, location: null, previousOwners: null, accidentStatus: null,
  knownDamage: null, inspectionDue: null, serviceHistory: null, equipment: [], description: null, listingUrl: null,
};

type Props = { value: Vehicle; onChange: (v: Vehicle) => void };
type Key = keyof Vehicle;

const selectCls =
  "h-11 w-full rounded-lg border border-input bg-transparent px-3 text-base outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 sm:text-sm";

export function VehicleForm({ value: v, onChange }: Props) {
  const value = v;
  const set = <K extends Key>(k: K, val: Vehicle[K]) => onChange({ ...v, [k]: val });
  const text = (k: Key) => ({
    value: (v[k] as string | null) ?? "",
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => set(k, (e.target.value.trim() ? e.target.value : null) as never),
  });
  const num = (k: Key, grouped = false) => ({
    type: "text",
    inputMode: "numeric" as const,
    value: v[k] === null ? "" : grouped ? (v[k] as number).toLocaleString("de-DE") : String(v[k]),
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => {
      const digits = e.target.value.replace(/\D/g, "");
      set(k, (digits ? Number(digits) : null) as never);
    },
  });
  const dec = (k: Key) => ({
    defaultValue: v[k] === null ? "" : String(v[k]).replace(".", ","),
    onBlur: (e: React.FocusEvent<HTMLInputElement>) => {
      const n = parseFloat(e.target.value.replace(",", "."));
      set(k, (Number.isFinite(n) ? n : null) as never);
    },
  });
  const sel = (k: Key, options: string[]) => (
    <select className={selectCls} value={(v[k] as string | null) ?? ""} onChange={(e) => set(k, (e.target.value || null) as never)}>
      <option value="">– unbekannt –</option>
      {options.map((o) => <option key={o} value={o}>{o}</option>)}
    </select>
  );

  return (
    <div className="grid gap-x-4 gap-y-4 sm:grid-cols-2 lg:grid-cols-3">
      <F label="Marke *"><Input className="h-11" placeholder="z. B. BMW" {...text("make")} /></F>
      <F label="Modell"><Input className="h-11" placeholder="z. B. 3er" {...text("model")} /></F>
      <F label="Variante / Typ"><Input className="h-11" placeholder="z. B. 320d Touring" {...text("variant")} /></F>
      <F label="Erstzulassung" hint="MM/JJJJ"><Input className="h-11" placeholder="03/2016" {...text("firstRegistration")} /></F>
      <F label="Kilometerstand"><Input className="h-11" placeholder="125.000" {...num("mileageKm", true)} /></F>
      <F label="Preis in €"><Input className="h-11" placeholder="14.900" {...num("priceEur", true)} /></F>
      <F label="Leistung in kW" hint={v.powerKw ? `≈ ${Math.round(v.powerKw * 1.36)} PS` : undefined}><Input className="h-11" placeholder="140" {...num("powerKw")} /></F>
      <F label="Hubraum in cm³" hint="im Fahrzeugschein, Feld P.1"><Input className="h-11" placeholder="1995" {...num("displacementCcm")} /></F>
      <F label="Kraftstoff">{sel("fuel", ["Benzin", "Diesel", "Hybrid", "Plug-in-Hybrid", "Elektro", "LPG", "CNG", "Sonstige"])}</F>
      <F label="Getriebe">{sel("transmission", ["Schaltgetriebe", "Automatik"])}</F>
      <F label="Getriebeart" hint="z. B. DSG, S tronic, Steptronic"><Input className="h-11" {...text("transmissionDetail")} /></F>
      <F label="Motorcode" hint="nur wenn bekannt"><Input className="h-11" placeholder="z. B. B47" {...text("engineCode")} /></F>
      <F label="CO₂ in g/km" hint="für die Kfz-Steuer"><Input className="h-11" placeholder="z. B. 128" {...num("co2GPerKm")} /></F>
      <F label={value.fuel === "Elektro" ? "Verbrauch kWh/100 km" : "Verbrauch l/100 km"} hint="kombiniert"><Input className="h-11" inputMode="decimal" placeholder="z. B. 5,4" {...dec("consumptionPer100km")} /></F>
      <F label="Verkäufer">{sel("sellerType", ["privat", "gewerblich"])}</F>
      <F label="Vorbesitzer"><Input className="h-11" {...num("previousOwners")} /></F>
      <F label="Unfallstatus">{sel("accidentStatus", ["unfallfrei", "Unfallschaden", "reparierter Unfallschaden"])}</F>
      <F label="HU/TÜV bis" hint="MM/JJJJ"><Input className="h-11" placeholder="08/2027" {...text("inspectionDue")} /></F>
      <F label="Standort"><Input className="h-11" {...text("location")} /></F>
      <F label="Bekannte Schäden"><Input className="h-11" {...text("knownDamage")} /></F>
      <F label="Servicehistorie" className="sm:col-span-2 lg:col-span-3">
        <Input className="h-11" placeholder="z. B. Scheckheft bei BMW, Zahnriemen 2022 bei 140.000 km" {...text("serviceHistory")} />
      </F>
      <F label="Beschreibung des Verkäufers" className="sm:col-span-2 lg:col-span-3">
        <Textarea rows={5} className="text-base sm:text-sm" placeholder="Text aus dem Inserat einfügen" {...text("description")} />
      </F>
    </div>
  );
}

function F({ label, hint, className = "", children }: { label: string; hint?: string; className?: string; children: React.ReactNode }) {
  return (
    <label className={`flex flex-col gap-1.5 ${className}`}>
      <span className="flex items-baseline justify-between gap-2 text-sm font-medium">
        {label}
        {hint && <span className="text-xs font-normal text-muted-foreground">{hint}</span>}
      </span>
      {children}
    </label>
  );
}
