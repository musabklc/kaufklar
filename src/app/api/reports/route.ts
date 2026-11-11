import { z } from "zod";
import { after } from "next/server";
import type { AiProvider } from "@/lib/ai/provider";
import { AiError, getProvider } from "@/lib/ai/provider";
import { COMPONENTS } from "@/lib/analysis/community";
import { fail, json, rateLimited } from "@/lib/server/http";
import { communityEnabled, oldestPending, recentReportsBy, reporterHash, saveReport, updateReport } from "@/lib/server/community";

export const maxDuration = 90;

const ReportSchema = z.object({
  make: z.string().trim().min(2).max(40),
  model: z.string().trim().min(1).max(60),
  engineCode: z.string().trim().max(20).nullable().optional(),
  year: z.number().int().min(1980).max(2030).nullable().optional(),
  mileageKm: z.number().int().min(0).max(1_000_000).nullable().optional(),
  component: z.enum(COMPONENTS),
  description: z.string().trim().min(15, "Bitte beschreibe das Problem in mindestens 15 Zeichen.").max(600),
  costEur: z.number().int().min(0).max(100_000).nullable().optional(),
  website: z.string().optional(), // Spamfalle, siehe unten
});

const MAX_PER_DAY = 5;

export async function POST(req: Request) {
  if (rateLimited(req, 5)) return fail("Zu viele Meldungen. Bitte kurz warten.", 429);
  if (!communityEnabled()) return fail("Meldungen sind auf diesem Server nicht aktiviert.", 503);

  const body = await req.json().catch(() => null);
  // Spamfalle ausgefüllt: still "Danke" antworten und nichts speichern – Bots lernen so nichts.
  if (body && typeof body.website === "string" && body.website) return json({ status: "pending", message: "Danke! Deine Meldung wird geprüft." });
  const parsed = ReportSchema.safeParse(body);
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Ungültige Meldung.");
  const r = parsed.data;

  const hash = reporterHash(req);
  if ((await recentReportsBy(hash)) >= MAX_PER_DAY) return fail("Du hast heute schon mehrere Meldungen abgegeben. Danke! Bitte morgen weiter.", 429);

  // KI-Moderation: ohne KI bleibt die Meldung "pending" und zählt nicht, bis sie geprüft ist.
  const ai = await getProvider();
  const { status, canonical, component, note } = await moderate(ai, { ...r, engineCode: r.engineCode ?? null, year: r.year ?? null });
  // Liegengebliebene Meldungen (KI war z. B. ausgelastet) nach der Antwort nachprüfen.
  if (ai && status !== "pending") after(() => recheckPending(ai).catch((e) => console.warn("recheck failed", e)));

  await saveReport({
    make: r.make,
    model: r.model,
    engine_code: r.engineCode?.toUpperCase() || null,
    year: r.year ?? null,
    mileage_km: r.mileageKm ?? null,
    component,
    description: status === "rejected" ? "[abgelehnt – nicht gespeichert]" : r.description, // abgelehnte Texte (evtl. mit persönlichen Daten) nicht aufbewahren
    cost_eur: r.costEur ?? null,
    status,
    canonical_title: canonical,
    moderation_note: note.slice(0, 300),
    reporter_hash: hash,
  });

  return json({
    status,
    message:
      status === "approved"
        ? "Danke! Deine Meldung wurde geprüft und fließt in die Kaufklar-Datenbank ein. Sichtbar wird ein Problem, sobald mehrere Personen es unabhängig melden."
        : status === "rejected"
          ? "Danke – diese Meldung können wir leider nicht übernehmen. Bitte beschreibe nur technische Probleme am Fahrzeug, ohne persönliche Daten."
          : "Danke! Deine Meldung wird geprüft, bevor sie in die Datenbank einfließt.",
  });
}

type ModInput = { make: string; model: string; engineCode: string | null; year: number | null; component: string; description: string };

async function moderate(ai: AiProvider | null, r: ModInput) {
  let status: "approved" | "rejected" | "pending" = "pending";
  let canonical: string | null = null;
  let component = r.component;
  let note = "KI-Moderation nicht verfügbar";
  if (ai) {
    try {
      const m = await ai.moderate(r);
      status = m.accept && !m.containsPersonalData ? "approved" : "rejected";
      canonical = m.canonicalTitle.trim().slice(0, 80);
      component = m.component;
      note = m.containsPersonalData ? `Abgelehnt: enthält personenbezogene Daten. ${m.reason}` : m.reason;
    } catch (e) {
      note = e instanceof AiError ? `KI-Moderation fehlgeschlagen: ${e.message}` : "KI-Moderation fehlgeschlagen";
    }
  }
  return { status, canonical, component, note };
}

async function recheckPending(ai: AiProvider) {
  for (const p of await oldestPending(3)) {
    const m = await moderate(ai, { make: p.make, model: p.model, engineCode: p.engine_code, year: p.year, component: p.component, description: p.description });
    if (m.status === "pending") return; // KI wieder ausgelastet – später erneut
    await updateReport(p.id, {
      status: m.status,
      canonical_title: m.canonical,
      component: m.component,
      moderation_note: m.note.slice(0, 300),
      ...(m.status === "rejected" ? { description: "[abgelehnt – nicht gespeichert]" } : {}),
    });
  }
}
