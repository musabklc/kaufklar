import { AiError, getProvider } from "@/lib/ai/provider";
import { fail, json, rateLimited, readImages } from "@/lib/server/http";
import { fetchListingText, LinkError } from "@/lib/server/link";

export const maxDuration = 120;

export async function POST(req: Request) {
  if (rateLimited(req)) return fail("Zu viele Anfragen. Bitte kurz warten.", 429);
  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return fail("Ungültige Anfrage.");
  }

  try {
    const url = String(form.get("url") ?? "").trim();
    const images = await readImages(form.getAll("images"));
    if (!url && !images.length) return fail("Bitte einen Link einfügen oder Bilder hochladen.");

    const text = url ? await fetchListingText(url) : undefined;
    const ai = await getProvider();
    if (!ai) return fail("Das automatische Auslesen braucht einen KI-Schlüssel (GEMINI_API_KEY, kostenlos). Nutze bis dahin die manuelle Eingabe.", 503);

    const result = await ai.extract({ text, images });
    if (url) result.vehicle.listingUrl = url;
    // Ganze Zahlen erzwingen (z. B. 60 PS → 44 kW statt 44,12).
    for (const k of ["powerKw", "mileageKm", "displacementCcm", "priceEur", "previousOwners", "co2GPerKm"] as const)
      if (typeof result.vehicle[k] === "number") result.vehicle[k] = Math.round(result.vehicle[k]!);
    return json(result);
  } catch (e) {
    if (e instanceof LinkError) return json({ error: e.message, code: e.code }, e.code === "INVALID" ? 400 : 422);
    if (e instanceof AiError) return fail(e.message, 502);
    if (e instanceof Error && /Bild|MB|Maximal/.test(e.message)) return fail(e.message);
    console.error("extract failed", e);
    return fail("Beim Auslesen ist ein Fehler aufgetreten.", 500);
  }
}
