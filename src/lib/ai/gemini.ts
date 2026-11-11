import "server-only";
import { GoogleGenAI } from "@google/genai";
import { z } from "zod";
import { AiAuditSchema, ExtractionSchema, ModerationSchema, type ReportInput, type Vehicle } from "../types";
import { AiError, type AiProvider, type ImageInput, type WebListing } from "./provider";
import { AUDIT_SYSTEM, EXTRACT_SYSTEM, MODERATE_SYSTEM, PRICE_SYSTEM } from "./prompts";
import { parseLenient, toGeminiSchema } from "./schema";

/**
 * Modellkette: Jedes Gratis-Modell hat ein eigenes Tageskontingent (gemini-3.8-flash nur ca. 20 Anfragen/Tag).
 * Ist eines ausgeschöpft (429) oder nicht verfügbar (404), wird automatisch das nächste genommen.
 */
const MODELS = (process.env.GEMINI_MODEL || "gemini-3.8-flash,gemini-3.5-flash-lite,gemini-3.1-flash-lite,gemma-4-31b-it")
  .split(",")
  .map((m) => m.trim())
  .filter(Boolean);
const MODEL = MODELS[0];
// Kunden warten höchstens so lange auf die KI; danach läuft die Analyse ohne KI-Teil weiter.
const PER_MODEL_MS = 40_000;
const TOTAL_MS = 75_000;
// shortcut: Merkt sich ausgeschöpfte Modelle nur im Speicher dieser Server-Instanz bis Mitternacht (US-Pazifik, wann Google zurücksetzt) – bei mehreren Instanzen in Redis ablegen.
const exhaustedUntil = new Map<string, number>();
const statusOf = (e: unknown) => (e as { status?: number }).status ?? (e as { statusCode?: number }).statusCode;

const WebListingsSchema = z.object({
  listings: z.array(
    z.object({ title: z.string(), priceEur: z.number(), year: z.number().nullable(), mileageKm: z.number().nullable(), url: z.string() }),
  ),
});
const PORTALS = /(^|\.)(mobile\.de|autoscout24\.(de|at|com)|kleinanzeigen\.de|heycar\.com|pkw\.de|autohero\.com|carwow\.de|meinauto\.de|automobile\.de)$/;

type Part = { type: "text"; text: string } | { type: "image"; data: string; mime_type: string };

export class GeminiProvider implements AiProvider {
  name = `Google ${MODEL}`;
  private client = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

  private async json<S extends z.ZodType>(schema: S, system: string, input: Part[], search = false): Promise<z.infer<S>> {
    const now = Date.now();
    const deadline = now + TOTAL_MS;
    const candidates = MODELS.filter((m) => (exhaustedUntil.get(m) ?? 0) < now);
    let last: unknown = new AiError("Das kostenlose KI-Kontingent ist für heute ausgeschöpft. Bitte morgen erneut versuchen.");
    for (const model of candidates) {
      const left = deadline - Date.now();
      if (left < 5_000) break;
      try {
        return await this.once(model, schema, system, input, search, Math.min(PER_MODEL_MS, left));
      } catch (e) {
        const st = statusOf(e);
        if (!st && !(e instanceof AiError)) {
          console.warn(`gemini: ${model} Zeitüberschreitung/Netzwerk – nächstes Modell`, (e as Error).message);
          last = new AiError("Die KI hat zu lange gebraucht. Bitte erneut versuchen.");
          continue;
        }
        // 429 Kontingent, 404 Modell fehlt, 5xx Google überlastet: jeweils sofort das nächste Modell.
        if (st === 429 || st === 404 || (st ?? 0) >= 500) {
          console.warn(`gemini: ${model} Status ${st} – nächstes Modell`);
          exhaustedUntil.set(model, now + (st === 429 ? 60 * 60e3 : st === 404 ? 24 * 60 * 60e3 : 2 * 60e3));
          last = e;
          continue;
        }
        throw this.mapError(e);
      }
    }
    throw this.mapError(last);
  }

  private mapError(e: unknown): unknown {
    if (e instanceof AiError) return e;
    const status = statusOf(e);
    if (!status) return e;
    console.error("gemini error", status, (e as Error).message);
    if (status === 429 || status === 404) return new AiError("Das kostenlose KI-Kontingent ist für heute ausgeschöpft. Bitte später erneut versuchen.");
    if (status === 401 || status === 403) return new AiError("Der Gemini-API-Schlüssel ist ungültig oder nicht freigeschaltet.");
    return new AiError(`KI-Dienst nicht erreichbar (${status}).`);
  }

  private async once<S extends z.ZodType>(model: string, schema: S, system: string, input: Part[], search: boolean, timeoutMs: number): Promise<z.infer<S>> {
    {
      const it = await this.client.interactions.create({
        model,
        store: false, // nichts serverseitig bei Google vorhalten
        system_instruction: system,
        input: [{ type: "user_input", content: input }], // API v1: Inhalte als user_input-Schritt
        response_format: { type: "text", mime_type: "application/json", schema: toGeminiSchema(schema) },
        ...(model.startsWith("gemini") ? { generation_config: { thinking_level: "low" } } : {}),
        ...(search ? { tools: [{ type: "google_search" }] } : {}),
      }, { timeout_ms: timeoutMs, retries: { strategy: "none" } }); // keine SDK-Wiederholungen: bei 429 sofort nächstes Modell
      if (it.status && it.status !== "completed") throw new AiError("Die KI-Antwort war unvollständig. Bitte erneut versuchen.");
      let data: unknown;
      try {
        data = JSON.parse(it.output_text ?? "");
      } catch {
        throw new AiError("Die KI-Antwort konnte nicht gelesen werden.");
      }
      const parsed = parseLenient(schema, data);
      if (!parsed) throw new AiError("Die KI-Antwort hatte ein unerwartetes Format.");
      return parsed;
    }
  }

  private images(images: ImageInput[]): Part[] {
    return images.flatMap((img, i) => [
      { type: "text" as const, text: `Bild ${i + 1}:` },
      { type: "image" as const, data: img.data, mime_type: img.mediaType },
    ]);
  }

  extract({ text, images = [] }: { text?: string; images?: ImageInput[] }) {
    const input: Part[] = [{ type: "text", text: "Lies die Fahrzeugdaten aus diesem Inserat aus." }];
    if (text) input.push({ type: "text", text: `<inserat>\n${text}\n</inserat>` });
    input.push(...this.images(images));
    return this.json(ExtractionSchema, EXTRACT_SYSTEM, input);
  }

  audit({ vehicle, knowledgeSummary, images, photosNote }: { vehicle: Vehicle; knowledgeSummary: string; images: ImageInput[]; photosNote?: string }) {
    return this.json(AiAuditSchema, AUDIT_SYSTEM, [
      { type: "text", text: images.length ? "Prüfe Inserat und Bilder." : (photosNote ?? "Prüfe das Inserat (keine Bilder vorhanden – erwähne das als Prüfpunkt).") },
      { type: "text", text: `Heutiges Datum: ${new Date().toLocaleDateString("de-DE")}` },
      { type: "text", text: `<fahrzeugdaten>\n${JSON.stringify(vehicle, null, 2)}\n</fahrzeugdaten>` },
      { type: "text", text: `<wissensdatenbank>\n${knowledgeSummary || "Keine Treffer in der Datenbank."}\n</wissensdatenbank>` },
      ...this.images(images),
    ]);
  }

  moderate(r: ReportInput) {
    return this.json(ModerationSchema, MODERATE_SYSTEM, [{ type: "text", text: `<meldung>
${JSON.stringify(r, null, 2)}
</meldung>` }]);
  }

  /** Nur mit bezahltem Gemini-Tarif (Google-Suche ist im Gratis-Tarif nicht enthalten). */
  async searchPrices(v: Vehicle): Promise<WebListing[]> {
    const q = [v.make, v.model, v.variant, v.fuel, v.powerKw && `${v.powerKw} kW`, v.firstRegistration && `EZ ${v.firstRegistration}`, v.mileageKm && `${v.mileageKm} km`].filter(Boolean).join(", ");
    const out = await this.json(WebListingsSchema, PRICE_SYSTEM, [{ type: "text", text: `Fahrzeug: ${q}` }], true);
    // Nur echte Inseratsportale und plausible Preise übernehmen – schützt vor erfundenen Links.
    return out.listings.filter((l) => {
      try {
        const u = new URL(l.url);
        return u.protocol === "https:" && PORTALS.test(u.hostname) && l.priceEur >= 500 && l.priceEur <= 500000;
      } catch {
        return false;
      }
    });
  }
}
