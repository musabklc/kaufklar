import { z } from "zod";
import { COMPONENTS } from "./analysis/community.ts";

/** Fahrzeugdaten, wie sie im Inserat stehen. `null` heißt: nicht angegeben / nicht erkannt – niemals raten. */
export const VehicleSchema = z.object({
  make: z.string().nullable().describe("Marke, z. B. BMW"),
  model: z.string().nullable().describe("Modell, z. B. 3er"),
  variant: z.string().nullable().describe("Modellvariante/Typbezeichnung, z. B. 320d Touring"),
  firstRegistration: z.string().nullable().describe("Erstzulassung als MM/JJJJ oder JJJJ"),
  mileageKm: z.number().nullable(),
  powerKw: z.number().nullable(),
  displacementCcm: z.number().nullable(),
  engineCode: z.string().nullable().describe("Nur wenn im Inserat ausdrücklich genannt, z. B. B47"),
  fuel: z.enum(["Benzin", "Diesel", "Hybrid", "Plug-in-Hybrid", "Elektro", "LPG", "CNG", "Sonstige"]).nullable(),
  transmission: z.enum(["Schaltgetriebe", "Automatik"]).nullable(),
  transmissionDetail: z.string().nullable().describe("z. B. DSG, S tronic, Steptronic, 8-Gang – nur wenn genannt"),
  priceEur: z.number().nullable(),
  co2GPerKm: z.number().nullable().describe("CO2-Emissionen kombiniert in g/km, nur wenn angegeben"),
  consumptionPer100km: z.number().nullable().describe("Verbrauch kombiniert: l/100 km (Verbrenner) bzw. kWh/100 km (Elektro), nur wenn angegeben"),
  sellerType: z.enum(["privat", "gewerblich"]).nullable(),
  location: z.string().nullable(),
  previousOwners: z.number().nullable(),
  accidentStatus: z.enum(["unfallfrei", "Unfallschaden", "reparierter Unfallschaden"]).nullable(),
  knownDamage: z.string().nullable(),
  inspectionDue: z.string().nullable().describe("HU/TÜV fällig, MM/JJJJ"),
  serviceHistory: z.string().nullable().describe("Angaben zu Scheckheft/Wartung, wörtlich zusammengefasst"),
  equipment: z.array(z.string()),
  description: z.string().nullable().describe("Beschreibungstext des Verkäufers, möglichst wörtlich"),
  listingUrl: z.string().nullable(),
});
export type Vehicle = z.infer<typeof VehicleSchema>;

export const ExtractionSchema = z.object({
  vehicle: VehicleSchema,
  uncertainties: z.array(z.string()).describe("Felder, die unleserlich oder widersprüchlich waren"),
});
export type Extraction = z.infer<typeof ExtractionSchema>;

/** Ergebnis der KI-Moderation einer Kundenmeldung. */
export const ModerationSchema = z.object({
  accept: z.boolean().describe("true nur bei einem plausiblen, sachlichen technischen Problem dieses Fahrzeugmodells"),
  reason: z.string().describe("kurze Begründung auf Deutsch"),
  canonicalTitle: z.string().describe("einheitlicher Problemtitel, höchstens 6 Wörter, z. B. 'Steuerkette gelängt'"),
  component: z.enum(COMPONENTS),
  containsPersonalData: z.boolean().describe("enthält Namen, Telefonnummern, Adressen, Kennzeichen o. ä."),
});
export type Moderation = z.infer<typeof ModerationSchema>;
export type ReportInput = { make: string; model: string; engineCode: string | null; year: number | null; component: string; description: string };

export const Level = z.enum(["niedrig", "mittel", "hoch"]);
export type Level = z.infer<typeof Level>;

/** Was die KI zusätzlich zur Wissensdatenbank liefert. Jeder Punkt ist als KI-Einschätzung gekennzeichnet. */
export const AiAuditSchema = z.object({
  expertSummary: z
    .string()
    .describe("Persönliches Fazit wie von einem erfahrenen Kfz-Gutachter an einen Freund: 4–6 Sätze, Du-Form, ehrlich und konkret, mit klarer Tendenz (würde ich kaufen / nur wenn … / Finger weg) und dem wichtigsten nächsten Schritt"),
  listingFindings: z.array(
    z.object({
      title: z.string(),
      detail: z.string(),
      status: z.enum(["bestaetigt", "verdacht", "pruefen"]),
      severity: Level,
      evidence: z.string().describe("Worauf stützt sich der Punkt? Zitat oder 'Bild N'"),
    }),
  ),
  modelIssues: z.array(
    z.object({
      title: z.string(),
      component: z.enum(["Motor", "Getriebe", "Fahrwerk", "Elektrik", "Karosserie", "Abgasanlage", "Sonstiges"]),
      detail: z.string(),
      risk: Level,
      costMinEur: z.number().nullable(),
      costMaxEur: z.number().nullable(),
      relevantFromKm: z.number().nullable(),
      howToDetect: z.string(),
    }),
  ),
  pros: z.array(z.string()),
  cons: z.array(z.string()),
  extraQuestions: z.array(z.string()),
  extraChecks: z.array(z.object({ area: z.string(), item: z.string() })),
  alternatives: z
    .array(
      z.object({
        make: z.string(),
        model: z.string(),
        years: z.string().describe("Baujahre/Generation, z. B. 2015–2019 (F31)"),
        engineHint: z.string().describe("empfohlene Motorisierung"),
        category: z.enum(["zuverlässiger", "schöner", "sparsamer", "mehr Platz"]),
        reason: z.string(),
        watchOut: z.string().describe("worauf man bei dieser Alternative achten muss"),
      }),
    )
    .describe("3–5 Alternativen im gleichen Budget"),
});
export type AiAudit = z.infer<typeof AiAuditSchema>;

export type Source = { label: string; url?: string };

/** Herkunft einer Aussage – die UI zeigt sie immer an. */
export type Provenance = "gesichert" | "modelltypisch" | "nutzer" | "ki" | "pruefen";

export type WeakPoint = {
  id: string;
  title: string;
  component: string;
  detail: string;
  risk: Level;
  costMin: number | null;
  costMax: number | null;
  relevantFromKm: number | null;
  detection: string;
  provenance: Provenance;
  origin: string; // z. B. "BMW N47" oder "KI-Einschätzung"
  relevantNow: boolean;
};

export type Finding = {
  title: string;
  detail: string;
  status: "bestaetigt" | "verdacht" | "pruefen";
  severity: Level;
  evidence: string;
  provenance: Provenance;
};

export type CostItem = { title: string; min: number; max: number; reason: string };

export type Scores = {
  condition: number | null;
  value: number | null;
  techRisk: number;
  transparency: number;
  overallRisk: number;
  breakdown: { label: string; points: number; note: string }[];
};

export type Recommendation = {
  verdict: "Kaufenswert" | "Nur nach genauer Prüfung" | "Preisverhandlung empfohlen" | "Lieber Abstand nehmen";
  reasons: string[];
};

export type Comp = { price: number; source: "nutzer" | "index" | "web"; url?: string; label?: string };

export type Alternative = AiAudit["alternatives"][number] & { searchUrl: string; indexMedian: number | null; indexCount: number };

export type Price = {
  asking: number | null;
  comps: Comp[];
  marketEstimate: number | null;
  fairMin: number | null;
  fairMax: number | null;
  note: string;
};

export type Negotiation = {
  entry: number;
  target: number;
  ceiling: number;
  arguments: string[];
  message: string;
} | null;

export type ChecklistSection = { area: string; items: { id: string; text: string; specific: boolean }[] };
export type GuideSection = { title: string; points: { text: string; specific: boolean }[] };

export type AnalysisResult = {
  id: string;
  createdAt: string;
  vehicle: Vehicle;
  matchedKnowledge: { name: string; matchNote: string; sources: Source[] }[];
  weakPoints: WeakPoint[];
  findings: Finding[];
  dueCosts: CostItem[];
  price: Price;
  scores: Scores;
  recommendation: Recommendation;
  checklist: ChecklistSection[];
  questions: string[];
  testDrive: GuideSection[];
  negotiation: Negotiation;
  summary: { pros: string[]; cons: string[]; mustCheck: string[] };
  alternatives: Alternative[];
  aiUsed: boolean;
  aiNote: string | null;
  /** Rohdaten der KI-Prüfung, damit die Analyse im Browser ohne neuen KI-Aufruf neu berechnet werden kann. */
  ai: AiAudit | null;
  /** Herkunft ergänzter Daten aus offenen Quellen (z. B. EU-Typdaten), für die Anzeige mit Quellenangabe. */
  dataNotes: string[];
  /** Offizielle EU-Rückrufe (Safety Gate), die zu diesem Fahrzeug passen. */
  recalls: import("./analysis/recalls").MatchedRecall[];
  /** Von Kunden gemeldete, freigegebene Probleme (Rohdaten für Neuberechnung im Browser). */
  community: import("./analysis/community").CommunityIssue[];
};
