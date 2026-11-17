import type { AiAudit, Extraction, Finder, FinderInput, ForumInsights, Inspection, Moderation, ReportInput, ServiceBook, Vehicle } from "../types";

export type ForumPostInput = { board: string; threadTitle: string; authorCar: string | null; body: string };

export type ImageInput = { mediaType: "image/jpeg" | "image/png" | "image/webp"; data: string };
export type WebListing = { title: string; priceEur: number; year: number | null; mileageKm: number | null; url: string; seller?: Seller };
export type Seller = "privat" | "gewerblich" | null;

/** Austauschbare KI-Schnittstelle – ein weiteres Modell braucht nur eine neue Implementierung. */
export interface AiProvider {
  name: string;
  extract(input: { text?: string; images?: ImageInput[] }): Promise<Extraction>;
  audit(input: { vehicle: Vehicle; knowledgeSummary: string; images: ImageInput[]; photosNote?: string }): Promise<AiAudit>;
  moderate(report: ReportInput): Promise<Moderation>;
  /** Erfahrungen (Schwachstellen/Pluspunkte) aus einem Forumsbeitrag herauslesen. */
  forumInsights(post: ForumPostInput): Promise<ForumInsights>;
  /** Auto-Finder: passende Modelle zu Budget und Wünschen. */
  finder(input: FinderInput): Promise<Finder>;
  /** Besichtigung: Fotos vom Auto bewerten. */
  inspect(input: { vehicle: Vehicle; images: ImageInput[]; labels: string[] }): Promise<Inspection>;
  /** Scheckheft-Fotos ablesen. */
  serviceBook(input: { vehicle: Vehicle; images: ImageInput[] }): Promise<ServiceBook>;
  /** Optional: Vergleichsangebote per Websuche (kostenpflichtige Tarife). */
}

export class AiError extends Error {}

/** Gemini im Gratis-Tarif – ohne Schlüssel läuft die Analyse ohne KI-Teil. */
export async function getProvider(): Promise<AiProvider | null> {
  if (process.env.GEMINI_API_KEY) {
    const { GeminiProvider } = await import("./gemini");
    return new GeminiProvider();
  }
  return null;
}

export const aiConfigured = () => Boolean(process.env.GEMINI_API_KEY);
export const webSearchEnabled = () => Boolean(process.env.GEMINI_API_KEY) && process.env.GEMINI_SEARCH_ENABLED === "true";
