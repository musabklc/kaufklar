import "server-only";
import { GoogleGenAI } from "@google/genai";
import { z } from "zod";
import { AiAuditSchema, ExtractionSchema, FinderSchema, ForumInsightsSchema, InspectionSchema, ModerationSchema, ResearchSchema, ServiceBookSchema, type FinderInput, type ReportInput, type Source, type Vehicle } from "../types";
import { AiError, type AiProvider, type ForumPostInput, type ImageInput } from "./provider";
import { AUDIT_SYSTEM, EXTRACT_SYSTEM, FINDER_SYSTEM, FORUM_SYSTEM, INSPECT_SYSTEM, MODERATE_SYSTEM, RESEARCH_FORMAT_SYSTEM, RESEARCH_SYSTEM, SERVICEBOOK_SYSTEM } from "./prompts";
import { parseLenient, toGeminiSchema } from "./schema";
import { aiBudgetExceeded, logEvent } from "../server/usage";

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
// Mit Google-Recherche braucht die KI länger (mehrere Suchen).
const SEARCH_PER_MODEL_MS = 70_000;
const SEARCH_TOTAL_MS = 110_000;
// shortcut: Merkt sich ausgeschöpfte Modelle nur im Speicher dieser Server-Instanz bis Mitternacht (US-Pazifik, wann Google zurücksetzt) – bei mehreren Instanzen in Redis ablegen.
const exhaustedUntil = new Map<string, number>();
const statusOf = (e: unknown) => (e as { status?: number }).status ?? (e as { statusCode?: number }).statusCode;


const OPS = new Map([[EXTRACT_SYSTEM, "extract"], [AUDIT_SYSTEM, "audit"], [MODERATE_SYSTEM, "moderate"], [FORUM_SYSTEM, "forum"], [FINDER_SYSTEM, "finder"], [INSPECT_SYSTEM, "inspect"], [SERVICEBOOK_SYSTEM, "servicebook"], [RESEARCH_FORMAT_SYSTEM, "research-format"]]);

type Part = { type: "text"; text: string } | { type: "image"; data: string; mime_type: string };

export class GeminiProvider implements AiProvider {
  name = `Google ${MODEL}`;
  private client = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

  private async json<S extends z.ZodType>(schema: S, system: string, input: Part[], search = false): Promise<z.infer<S>> {
    if (await aiBudgetExceeded()) throw new AiError("Das Tageslimit für KI-Prüfungen ist erreicht. Bitte morgen erneut versuchen.");
    const now = Date.now();
    const deadline = now + (search ? SEARCH_TOTAL_MS : TOTAL_MS);
    const candidates = MODELS.filter((m) => (exhaustedUntil.get(m) ?? 0) < now);
    let last: unknown = new AiError("Das KI-Kontingent ist gerade ausgeschöpft. Bitte später erneut versuchen.");
    for (const model of candidates) {
      const left = deadline - Date.now();
      if (left < 5_000) break;
      try {
        return await this.once(model, schema, system, input, search, Math.min(search ? SEARCH_PER_MODEL_MS : PER_MODEL_MS, left));
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
    if (status === 429 || status === 404) return new AiError("Das KI-Kontingent ist gerade ausgeschöpft. Bitte später erneut versuchen.");
    if (status === 401 || status === 403) return new AiError("Der Gemini-API-Schlüssel ist ungültig oder nicht freigeschaltet.");
    return new AiError(`KI-Dienst nicht erreichbar (${status}).`);
  }

  private async once<S extends z.ZodType>(model: string, schema: S, system: string, input: Part[], search: boolean, timeoutMs: number): Promise<z.infer<S>> {
    {
      const started = Date.now();
      const op = OPS.get(system);
      const it = await this.client.interactions.create({
        model,
        store: false, // nichts serverseitig bei Google vorhalten
        system_instruction: system,
        input: [{ type: "user_input", content: input }], // API v1: Inhalte als user_input-Schritt
        response_format: { type: "text", mime_type: "application/json", schema: toGeminiSchema(schema) },
        ...(model.startsWith("gemini") ? { generation_config: { thinking_level: "low" } } : {}),
        ...(search ? { tools: [{ type: "google_search" }] } : {}),
      }, { timeout_ms: timeoutMs, retries: { strategy: "none" } }) // keine SDK-Wiederholungen: bei 429 sofort nächstes Modell
        .catch(async (e) => {
          await logEvent({ kind: "ai", op, model, ok: false, ms: Date.now() - started, error: `${statusOf(e) ?? "netz"}: ${(e as Error).message}` });
          throw e;
        });
      const u = it.usage;
      await logEvent({ kind: "ai", op, model, ok: it.status === undefined || it.status === "completed", ms: Date.now() - started, inputTokens: u?.total_input_tokens, outputTokens: (u?.total_output_tokens ?? 0) + (u?.total_thought_tokens ?? 0) || undefined });
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

  /**
   * Recherchebericht als Fließtext mit erzwungener Google-Suche. Nur so hängt Google zuverlässig die Belege an
   * (bei JSON-Ausgabe fehlen sie meist). Die Quellen landen in `sources` – echte Such-Treffer, keine von der KI geschriebenen Links.
   */
  private async report(system: string, input: Part[], sources: Source[]): Promise<string> {
    if (await aiBudgetExceeded()) throw new AiError("Das Tageslimit für KI-Prüfungen ist erreicht. Bitte morgen erneut versuchen.");
    const now = Date.now();
    let last: unknown = new AiError("Das KI-Kontingent ist gerade ausgeschöpft. Bitte später erneut versuchen.");
    for (const model of MODELS.filter((m) => m.startsWith("gemini") && (exhaustedUntil.get(m) ?? 0) < now)) {
      const started = Date.now();
      try {
        const it = await this.client.interactions.create(
          { model, store: false, system_instruction: system, input: [{ type: "user_input", content: input }], generation_config: { thinking_level: "low", tool_choice: "any" }, tools: [{ type: "google_search" }] },
          { timeout_ms: SEARCH_PER_MODEL_MS, retries: { strategy: "none" } },
        );
        const u = it.usage;
        await logEvent({ kind: "ai", op: "research", model, ok: it.status === undefined || it.status === "completed", ms: Date.now() - started, inputTokens: u?.total_input_tokens, outputTokens: (u?.total_output_tokens ?? 0) + (u?.total_thought_tokens ?? 0) || undefined });
        if ((it.status && it.status !== "completed") || !it.output_text) throw new AiError("Die Recherche war unvollständig.");
        for (const step of it.steps ?? [])
          if (step.type === "model_output")
            for (const c of step.content ?? [])
              if (c.type === "text")
                for (const a of c.annotations ?? [])
                  if (a.type === "url_citation" && a.url?.startsWith("https://") && !sources.some((x) => x.url === a.url) && sources.length < 8)
                    sources.push({ label: a.title || new URL(a.url).hostname, url: a.url });
        return it.output_text;
      } catch (e) {
        const st = statusOf(e);
        if (!(e instanceof AiError)) await logEvent({ kind: "ai", op: "research", model, ok: false, ms: Date.now() - started, error: `${st ?? "netz"}: ${(e as Error).message}` });
        if (st === 429 || st === 404) exhaustedUntil.set(model, now + (st === 429 ? 60 * 60e3 : 24 * 60 * 60e3));
        last = e;
      }
    }
    throw this.mapError(last);
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
    ]); // ohne Google-Suche: Typwissen kommt aus Datenbank und gespeicherter Recherche
  }

  /** Einmalige Typ-Recherche mit Google-Suche. */
  async research(vehicle: Vehicle, label: string) {
    const sources: Source[] = [];
    const report = await this.report(RESEARCH_SYSTEM, [
      { type: "text", text: `Heutiges Datum: ${new Date().toLocaleDateString("de-DE")}` },
      { type: "text", text: `<fahrzeugtyp>
${label}
${JSON.stringify({ make: vehicle.make, model: vehicle.model, variant: vehicle.variant, fuel: vehicle.fuel, displacementCcm: vehicle.displacementCcm, powerKw: vehicle.powerKw, engineCode: vehicle.engineCode, transmission: vehicle.transmission, transmissionDetail: vehicle.transmissionDetail }, null, 2)}
</fahrzeugtyp>` },
    ], sources);
    const research = await this.json(ResearchSchema, RESEARCH_FORMAT_SYSTEM, [{ type: "text", text: `<fahrzeugtyp>${label}</fahrzeugtyp>
<bericht>
${report}
</bericht>` }]);
    return { research, sources };
  }

  inspect({ vehicle, images, labels }: { vehicle: Vehicle; images: ImageInput[]; labels: string[] }) {
    return this.json(InspectionSchema, INSPECT_SYSTEM, [
      { type: "text", text: `Heutiges Datum: ${new Date().toLocaleDateString("de-DE")}` },
      { type: "text", text: `<fahrzeug>\n${JSON.stringify({ make: vehicle.make, model: vehicle.model, variant: vehicle.variant, firstRegistration: vehicle.firstRegistration, mileageKm: vehicle.mileageKm }, null, 2)}\n</fahrzeug>` },
      ...images.flatMap((img, i) => [
        { type: "text" as const, text: `Bild ${i + 1} (laut Käufer: ${labels[i] || "ohne Angabe"}):` },
        { type: "image" as const, data: img.data, mime_type: img.mediaType },
      ]),
    ]);
  }

  serviceBook({ vehicle, images }: { vehicle: Vehicle; images: ImageInput[] }) {
    return this.json(ServiceBookSchema, SERVICEBOOK_SYSTEM, [
      { type: "text", text: `Fahrzeug: ${[vehicle.make, vehicle.model, vehicle.variant].filter(Boolean).join(" ")}, EZ ${vehicle.firstRegistration ?? "?"}, laut Inserat ${vehicle.mileageKm ?? "?"} km.` },
      ...this.images(images),
    ]);
  }

  finder(input: FinderInput) {
    return this.json(FinderSchema, FINDER_SYSTEM, [{ type: "text", text: `Heutiges Datum: ${new Date().toLocaleDateString("de-DE")}\n<wuensche>\n${JSON.stringify(input, null, 2)}\n</wuensche>` }]);
  }

  forumInsights(p: ForumPostInput) {
    return this.json(ForumInsightsSchema, FORUM_SYSTEM, [{ type: "text", text: `<kontext>
Unterforum: ${p.board}
Thema: ${p.threadTitle}
Auto des Verfassers (Profil): ${p.authorCar ?? "nicht angegeben"}
</kontext>
<beitrag>
${p.body}
</beitrag>` }]);
  }

  moderate(r: ReportInput) {
    return this.json(ModerationSchema, MODERATE_SYSTEM, [{ type: "text", text: `<meldung>
${JSON.stringify(r, null, 2)}
</meldung>` }]);
  }
}
