import { z } from "zod";
import { getProvider } from "@/lib/ai/provider";
import { checkServiceBook } from "@/lib/analysis/servicebook";
import { fail, json, rateLimited, readImages } from "@/lib/server/http";
import { VehicleSchema } from "@/lib/types";

export const maxDuration = 90;

const MAX_PHOTOS = 6; // Vercel nimmt höchstens 4,5 MB pro Anfrage; der Browser verkleinert vorher auf 1600 px

/**
 * Vor Ort: Fotos vom Auto bewerten (mode=fotos) oder Scheckheft ablesen und prüfen (mode=scheckheft).
 * Die Fotos werden nur an die KI geschickt, nicht gespeichert.
 */
export async function POST(req: Request) {
  if (rateLimited(req, 6)) return fail("Zu viele Anfragen. Bitte kurz warten.", 429);
  const ai = await getProvider();
  if (!ai) return fail("Die KI-Prüfung ist auf diesem Server nicht aktiv.", 503);
  let form, vehicle, images, labels, mode;
  try {
    form = await req.formData();
    mode = z.enum(["fotos", "scheckheft"]).parse(form.get("mode"));
    vehicle = VehicleSchema.parse(JSON.parse(String(form.get("vehicle"))));
    images = await readImages(form.getAll("images"));
    labels = z.array(z.string().max(60)).max(MAX_PHOTOS).parse(JSON.parse(String(form.get("labels") ?? "[]")));
  } catch (e) {
    return fail(e instanceof Error && /Bild|MB|Maximal/.test(e.message) ? e.message : "Ungültige Anfrage.");
  }
  if (!images.length) return fail("Bitte mindestens ein Foto aufnehmen.");
  if (images.length > MAX_PHOTOS) return fail(`Höchstens ${MAX_PHOTOS} Fotos auf einmal.`);
  try {
    if (mode === "fotos") return json({ ...(await ai.inspect({ vehicle, images, labels })), at: new Date().toISOString(), labels });
    const book = await ai.serviceBook({ vehicle, images });
    return json({ ...book, at: new Date().toISOString(), checks: checkServiceBook(book.entries, vehicle.mileageKm, new Date()) });
  } catch {
    return fail("Die KI ist gerade ausgelastet. Bitte in einer Minute erneut versuchen.", 503);
  }
}
