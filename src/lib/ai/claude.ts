import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import type { z } from "zod";
import { AiAuditSchema, ExtractionSchema, ModerationSchema, type ReportInput, type Vehicle } from "../types";
import { AiError, type AiProvider, type ImageInput } from "./provider";
import { AUDIT_SYSTEM, EXTRACT_SYSTEM, MODERATE_SYSTEM } from "./prompts";

const MODEL = process.env.ANTHROPIC_MODEL || "claude-opus-5-5";

type Content = Anthropic.Beta.Messages.BetaContentBlockParam[];

async function structured<S extends z.ZodType>(schema: S, system: string, content: Content): Promise<z.infer<S>> {
  const client = new Anthropic();
  try {
    const stream = client.beta.messages.stream({
      model: MODEL,
      max_tokens: 32000,
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      thinking: { type: "adaptive" },
      output_config: { effort: "medium", format: betaZodOutputFormat(schema) },
      system,
      messages: [{ role: "user", content }],
    });
    const msg = await stream.finalMessage();
    if (msg.stop_reason === "refusal") throw new AiError("Die KI hat diese Anfrage abgelehnt.");
    if (msg.stop_reason === "max_tokens") throw new AiError("Die KI-Antwort war zu lang und wurde abgeschnitten.");
    if (!msg.parsed_output) throw new AiError("Die KI-Antwort konnte nicht gelesen werden.");
    return msg.parsed_output as z.infer<S>;
  } catch (e) {
    if (e instanceof AiError) throw e;
    if (e instanceof Anthropic.RateLimitError) throw new AiError("Die KI ist gerade ausgelastet. Bitte in einer Minute erneut versuchen.");
    if (e instanceof Anthropic.AuthenticationError) throw new AiError("Der KI-API-Schlüssel ist ungültig.");
    if (e instanceof Anthropic.APIError) throw new AiError(`KI-Dienst nicht erreichbar (${e.status ?? "Netzwerk"}).`);
    throw e;
  }
}

const imageBlocks = (images: ImageInput[]): Content =>
  images.flatMap((img, i) => [
    { type: "text" as const, text: `Bild ${i + 1}:` },
    { type: "image" as const, source: { type: "base64" as const, media_type: img.mediaType, data: img.data } },
  ]);

export class ClaudeProvider implements AiProvider {
  name = `Anthropic ${MODEL}`;

  extract({ text, images = [] }: { text?: string; images?: ImageInput[] }) {
    const content: Content = [...imageBlocks(images)];
    if (text) content.push({ type: "text", text: `<inserat>\n${text}\n</inserat>` });
    content.push({ type: "text", text: "Lies die Fahrzeugdaten aus diesem Inserat aus." });
    return structured(ExtractionSchema, EXTRACT_SYSTEM, content);
  }

  audit({ vehicle, knowledgeSummary, images, photosNote }: { vehicle: Vehicle; knowledgeSummary: string; images: ImageInput[]; photosNote?: string }) {
    const content: Content = [
      ...imageBlocks(images),
      { type: "text", text: `Heutiges Datum: ${new Date().toLocaleDateString("de-DE")}` },
      { type: "text", text: `<fahrzeugdaten>\n${JSON.stringify(vehicle satisfies Vehicle, null, 2)}\n</fahrzeugdaten>` },
      { type: "text", text: `<wissensdatenbank>\n${knowledgeSummary || "Keine Treffer in der Datenbank."}\n</wissensdatenbank>` },
      { type: "text", text: images.length ? "Prüfe Inserat und Bilder." : (photosNote ?? "Prüfe das Inserat (keine Bilder vorhanden – erwähne das als Prüfpunkt).") },
    ];
    return structured(AiAuditSchema, AUDIT_SYSTEM, content);
  }

  moderate(r: ReportInput) {
    return structured(ModerationSchema, MODERATE_SYSTEM, [{ type: "text", text: `<meldung>
${JSON.stringify(r, null, 2)}
</meldung>` }]);
  }
}
