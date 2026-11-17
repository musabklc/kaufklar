import { getProvider } from "@/lib/ai/provider";
import { matchKnowledge } from "@/lib/analysis/knowledge";
import { kaSearchUrl } from "@/lib/analysis/market";
import { fail, json, rateLimited } from "@/lib/server/http";
import { modelMedian } from "@/lib/server/price-index";
import { FinderInputSchema, type Vehicle } from "@/lib/types";

export const maxDuration = 60;

// Nur für die Zuordnung zur Wissensdatenbank (vehicle-form ist ein Client-Modul, daher hier eigenständig)
const EMPTY: Vehicle = {
  make: null, model: null, variant: null, firstRegistration: null, mileageKm: null, powerKw: null, displacementCcm: null, engineCode: null,
  fuel: null, transmission: null, transmissionDetail: null, priceEur: null, co2GPerKm: null, consumptionPer100km: null, sellerType: null,
  location: null, previousOwners: null, accidentStatus: null, knownDamage: null, inspectionDue: null, serviceHistory: null, equipment: [],
  description: null, listingUrl: null,
};

export type FinderResult = {
  intro: string;
  cars: {
    make: string;
    model: string;
    generation: string;
    engine: string;
    fuel: string;
    why: string;
    watchOut: string[];
    avoid: string | null;
    indexMedian: number | null;
    indexCount: number;
    searchUrl: string | null;
    knowledge: { id: string; name: string }[];
  }[];
};

/** Auto-Finder: KI schlägt Modelle vor, Tachoklar ergänzt echte Marktpreise, bekannte Schwachstellen und Suchlink. */
export async function POST(req: Request) {
  if (rateLimited(req, 5)) return fail("Zu viele Anfragen. Bitte kurz warten.", 429);
  const parsed = FinderInputSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return fail("Bitte alle Angaben ausfüllen.");
  const ai = await getProvider();
  if (!ai) return fail("Der Auto-Finder ist auf diesem Server nicht aktiv.", 503);
  let out;
  try {
    out = await ai.finder(parsed.data);
  } catch {
    return fail("Die KI ist gerade ausgelastet. Bitte in einer Minute erneut versuchen.", 503);
  }
  const cars = await Promise.all(
    out.cars.slice(0, 5).map(async (c) => {
      const years = `${c.firstYear}–${c.firstYear + 3}`;
      const v: Vehicle = { ...EMPTY, make: c.make, model: c.model, variant: c.engine, firstRegistration: String(c.firstYear), fuel: c.fuel === "LPG" ? "LPG" : c.fuel };
      const idx = await modelMedian(c.make, c.model, years).catch(() => ({ median: null, count: 0 }));
      return {
        make: c.make,
        model: c.model,
        generation: c.generation,
        engine: c.engine,
        fuel: c.fuel,
        why: c.why,
        watchOut: c.watchOut.slice(0, 3),
        avoid: c.avoid,
        indexMedian: idx.median,
        indexCount: idx.count,
        searchUrl: kaSearchUrl({ make: c.make, model: c.model, variant: c.engine, firstRegistration: String(c.firstYear), mileageKm: null }),
        knowledge: matchKnowledge(v).map((k) => ({ id: k.id, name: k.name })),
      };
    }),
  );
  return json({ intro: out.intro, cars } satisfies FinderResult);
}
