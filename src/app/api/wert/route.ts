import { z } from "zod";
import { valuation, type Valuation } from "@/lib/analysis/value";
import { fail, json, rateLimited } from "@/lib/server/http";
import { searchKleinanzeigen, verifyListings } from "@/lib/server/link";
import { findComparables, recordObservations } from "@/lib/server/price-index";
import type { Vehicle } from "@/lib/types";

export const maxDuration = 60;

const Input = z.object({
  make: z.string().trim().min(2).max(40),
  model: z.string().trim().min(1).max(40),
  variant: z.string().trim().max(60).default(""),
  year: z.number().int().min(1980).max(new Date().getFullYear()),
  mileageKm: z.number().int().min(0).max(1_500_000),
  fuel: z.enum(["Benzin", "Diesel", "Hybrid", "Plug-in-Hybrid", "Elektro", "LPG", "CNG", "Sonstige"]).nullable(),
});

export type WertResult = { valuation: Valuation | null; comps: { price: number; label: string; url: string | null; seller: string | null }[] };

/** "Was ist mein Auto wert?" – live die gleichen Vergleichsangebote wie bei der Kaufanalyse, umgekehrt gelesen. */
export async function POST(req: Request) {
  if (await rateLimited(req, 5)) return fail("Zu viele Anfragen. Bitte etwas später erneut versuchen.", 429);
  const p = Input.safeParse(await req.json().catch(() => null));
  if (!p.success) return fail("Bitte Marke, Modell, Baujahr und Kilometerstand angeben.");
  const v: Vehicle = {
    make: p.data.make, model: p.data.model, variant: p.data.variant || null, firstRegistration: String(p.data.year), mileageKm: p.data.mileageKm,
    fuel: p.data.fuel, powerKw: null, displacementCcm: null, engineCode: null, transmission: null, transmissionDetail: null, priceEur: null,
    co2GPerKm: null, consumptionPer100km: null, sellerType: null, location: null, previousOwners: null, accidentStatus: null, knownDamage: null,
    inspectionDue: null, serviceHistory: null, equipment: [], description: null, listingUrl: null,
  };
  const [web, index] = await Promise.all([
    searchKleinanzeigen(v).then((ka) => verifyListings(ka.slice(0, 12), v.make)).catch(() => []),
    findComparables(v).catch(() => []),
  ]);
  const comps = [
    ...web.map((w) => ({ price: w.priceEur, label: w.title, url: w.url, seller: w.seller ?? null })),
    ...index.filter((c) => !web.some((w) => w.url === c.url)).map((c) => ({ price: c.price, label: c.label ?? "Früher geprüftes Angebot", url: c.url ?? null, seller: c.seller ?? null })),
  ];
  await recordObservations(v, false, web).catch(() => {}); // wächst den Preisindex für spätere Analysen
  return json({ valuation: valuation(comps.map((c) => c.price)), comps: comps.slice(0, 12) } satisfies WertResult);
}
