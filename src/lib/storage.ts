import { useMemo, useSyncExternalStore } from "react";
import type { AnalysisResult } from "./types";

// Analysen bleiben ausschließlich im Browser des Nutzers (DSGVO-freundlich, kein Konto nötig).
const KEY = "kk-analyses";
const MAX = 20;
const EVENT = "kk-storage";

function get(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}
function set(key: string, value: string | null) {
  try {
    if (value === null) localStorage.removeItem(key);
    else localStorage.setItem(key, value);
  } catch {
    /* Speicher voll oder blockiert – Daten bleiben nur für diese Sitzung sichtbar */
  }
  window.dispatchEvent(new Event(EVENT)); // 'storage' feuert nicht im selben Tab
}
const parse = <T,>(raw: string | null, fallback: T): T => {
  try {
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
};

const subscribe = (cb: () => void) => {
  window.addEventListener("storage", cb);
  window.addEventListener(EVENT, cb);
  return () => (window.removeEventListener("storage", cb), window.removeEventListener(EVENT, cb));
};

/** Liest einen localStorage-Wert reaktiv. `undefined` = noch nicht im Browser (Server-Render). */
function useStored(key: string): string | null | undefined {
  return useSyncExternalStore(subscribe, () => get(key), () => undefined);
}

const read = (): AnalysisResult[] => parse(get(KEY), []);
const write = (list: AnalysisResult[]) => set(KEY, JSON.stringify(list.slice(0, MAX)));

/** Ältere gespeicherte Analysen auf das aktuelle Format bringen. */
function normalize(a: AnalysisResult): AnalysisResult {
  return {
    ...a,
    alternatives: a.alternatives ?? [],
    dataNotes: a.dataNotes ?? [],
    recalls: a.recalls ?? [],
    community: a.community ?? [],
    price: { ...a.price, comps: (a.price.comps as unknown[]).map((c) => (typeof c === "number" ? { price: c, source: "nutzer" as const } : (c as AnalysisResult["price"]["comps"][number]))) },
    vehicle: { ...a.vehicle, co2GPerKm: a.vehicle.co2GPerKm ?? null, consumptionPer100km: a.vehicle.consumptionPer100km ?? null },
  };
}

export function useAnalyses(): AnalysisResult[] | undefined {
  const raw = useStored(KEY);
  return useMemo(() => (raw === undefined ? undefined : parse<AnalysisResult[]>(raw, []).map(normalize)), [raw]);
}
export function useAnalysis(id: string): AnalysisResult | null | undefined {
  const list = useAnalyses();
  return list === undefined ? undefined : (list.find((a) => a.id === id) ?? null);
}
export const saveAnalysis = (a: AnalysisResult) => write([a, ...read().filter((x) => x.id !== a.id)]);
export function deleteAnalysis(id: string) {
  write(read().filter((a) => a.id !== id));
  set(`kk-check-${id}`, null);
}

export function useChecked(id: string): [string[], (ids: string[]) => void] {
  const raw = useStored(`kk-check-${id}`);
  const ids = useMemo(() => parse<string[]>(raw ?? null, []), [raw]);
  return [ids, (next) => set(`kk-check-${id}`, JSON.stringify(next))];
}
