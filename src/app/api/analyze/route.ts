import { z } from "zod";
import { AiError, getProvider, webSearchEnabled } from "@/lib/ai/provider";
import type { WebListing } from "@/lib/ai/provider";
import { buildAnalysis } from "@/lib/analysis/engine";
import { matchKnowledge } from "@/lib/analysis/knowledge";
import { fail, json, rateLimited, readImages } from "@/lib/server/http";
import { findComparables, modelMedian, recordObservations } from "@/lib/server/price-index";
import { eeaLookup } from "@/lib/server/eea";
import { recallsFor } from "@/lib/server/recalls";
import { communityIssuesFor } from "@/lib/server/community";
import { fillFromEea } from "@/lib/analysis/eea-match";
import { sealSecret, verifySeal } from "@/lib/seal";
import { VehicleSchema, type AiAudit, type Alternative, type Comp } from "@/lib/types";

export const maxDuration = 180;

const CompsSchema = z.array(z.number()).max(20);
const OriginSchema = z.enum(["link", "bilder", "manuell"]).catch("manuell");

export async function POST(req: Request) {
  if (rateLimited(req)) return fail("Zu viele Anfragen. Bitte kurz warten.", 429);
  let vehicle, userComps, images, origin, seal;
  try {
    const form = await req.formData();
    vehicle = VehicleSchema.parse(JSON.parse(String(form.get("vehicle"))));
    userComps = CompsSchema.parse(JSON.parse(String(form.get("comps") ?? "[]")));
    origin = OriginSchema.parse(form.get("origin"));
    seal = form.get("seal");
    images = await readImages(form.getAll("images"));
  } catch (e) {
    return fail(e instanceof Error && /Bild|MB|Maximal/.test(e.message) ? e.message : "Ungültige Fahrzeugdaten.");
  }
  if (!vehicle.make) return fail("Mindestens die Marke wird für eine Analyse benötigt.");
  // Vor der EEA-Ergänzung prüfen – das Siegel gilt für die ausgelesenen Originaldaten.
  const sealed = origin !== "manuell" && Boolean(sealSecret()) && verifySeal(vehicle, String(seal ?? ""), sealSecret());

  // Offene EU-Typdaten ergänzen fehlende technische Angaben (nie überschreiben) – vor KI und Wissensdatenbank.
  const dataNotes: string[] = [];
  const eea = await eeaLookup(vehicle);
  if (eea) {
    const filled = fillFromEea(vehicle, eea);
    vehicle = filled.vehicle;
    if (filled.filled.length)
      dataNotes.push(`Aus den EU-Typdaten ergänzt: ${filled.filled.join(", ")} (${eea.matches} passende Typeinträge, z. B. „${eea.names[0]}“). Quelle: Europäische Umweltagentur, CC BY 4.0.`);
  }

  const provider = await getProvider();
  let aiNote: string | null = provider ? null : "KI-Prüfung nicht aktiv (kein API-Schlüssel konfiguriert). Analyse basiert auf Wissensdatenbank und Regelprüfung.";

  const auditP: Promise<AiAudit | null> = provider
    ? provider
        .audit({
          vehicle,
          images,
          // Beim Link-Import hat das Inserat Fotos, wir übermitteln sie nur nicht – dann darf die KI keine "fehlenden Bilder" bemängeln.
          photosNote: origin === "link" && !images.length ? "Prüfe das Inserat. Die Fotos des Inserats liegen dir nicht vor (Link-Import) – bewerte sie nicht und bemängle keine fehlenden Bilder." : undefined,
          knowledgeSummary: matchKnowledge(vehicle).map((e) => `${e.name}: ${e.weakPoints.map((w) => w.title).join("; ")}`).join("\n"),
        })
        .catch((e) => {
          // Analyse trotzdem liefern – nur ohne KI-Teil, und das transparent anzeigen.
          aiNote = e instanceof AiError ? `KI-Prüfung fehlgeschlagen: ${e.message}` : "KI-Prüfung fehlgeschlagen.";
          if (!(e instanceof AiError)) console.error("audit failed", e);
          return null;
        })
    : Promise.resolve(null);
  const webP: Promise<WebListing[]> =
    provider?.searchPrices && webSearchEnabled()
      ? provider.searchPrices(vehicle).catch((e) => (console.error("price search failed", e), []))
      : Promise.resolve([]);

  const [ai, web, indexComps, recalls, community] = await Promise.all([auditP, webP, findComparables(vehicle), recallsFor(vehicle, eea?.typeApprovals ?? []), communityIssuesFor(vehicle)]);

  const comps: Comp[] = [
    ...indexComps,
    ...web.filter((w) => w.url !== vehicle.listingUrl).map((w) => ({ price: w.priceEur, source: "web" as const, url: w.url, label: w.title })),
    ...userComps.map((price) => ({ price, source: "nutzer" as const })),
  ];

  const alternatives: Alternative[] = await Promise.all(
    (ai?.alternatives ?? []).slice(0, 5).map(async (a) => {
      const idx = await modelMedian(a.make, a.model, a.years);
      return {
        ...a,
        indexMedian: idx.median,
        indexCount: idx.count,
        searchUrl: `https://www.google.com/search?q=${encodeURIComponent(`${a.make} ${a.model} ${a.engineHint} gebraucht kaufen`)}`,
      };
    }),
  );

  const result = buildAnalysis({ id: crypto.randomUUID(), vehicle, comps, ai, aiNote, alternatives, dataNotes, recalls, community });
  // Nur gesiegelte, unverändert ausgelesene Inserate fließen in den Index (Schutz vor erfundenen Preisen).
  await recordObservations(vehicle, sealed, web);
  return json(result);
}
