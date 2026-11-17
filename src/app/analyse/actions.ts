"use server";

import { z } from "zod";
import { currentUser } from "@/lib/supabase/server";
import { deleteAnalysis, getAnalysis, visible } from "@/lib/server/analyses";
import { confirmSession, createCheckout, premiumEnabled } from "@/lib/server/payments";
import { headers } from "next/headers";
import { SITE_URL } from "@/lib/site";
import type { AnalysisResult } from "@/lib/types";

const Id = z.string().uuid();

/** Analyse vom Server laden (Link auf anderem Gerät oder geteilt). */
export async function loadAnalysis(id: string): Promise<AnalysisResult | null> {
  if (!Id.safeParse(id).success) return null;
  const row = await getAnalysis(id);
  return row ? visible(row.result, row.premium) : null;
}

/** Bezahlung starten. consent = Häkchen zum sofortigen Beginn und Erlöschen des Widerrufsrechts (Pflicht). */
export async function startCheckout(id: string, consent: boolean): Promise<{ url: string } | { error: string }> {
  if (!Id.safeParse(id).success || !premiumEnabled()) return { error: "Bezahlung ist gerade nicht möglich." };
  if (!consent) return { error: "Bitte bestätige den Hinweis zum Widerrufsrecht." };
  const row = await getAnalysis(id);
  if (!row) return { error: "Analyse nicht gefunden. Bitte neu analysieren." };
  if (row.premium) return { error: "Dieser Bericht ist bereits freigeschaltet." };
  const v = row.result.vehicle;
  // Live immer tachoklar.de; lokal/Vorschau zurück zur aufrufenden Adresse
  const h = await headers();
  const origin = process.env.VERCEL_ENV === "production" ? SITE_URL : `${h.get("x-forwarded-proto") ?? "http"}://${h.get("host")}`;
  try {
    const url = await createCheckout({ analysisId: id, title: [v.make, v.model, v.variant].filter(Boolean).join(" ") || "Fahrzeug", userId: (await currentUser())?.id ?? null, origin });
    return { url };
  } catch (e) {
    console.error("checkout failed", (e as Error).message);
    return { error: "Die Bezahlseite konnte nicht geöffnet werden. Bitte später erneut versuchen." };
  }
}

/** Nach der Rückkehr von Stripe: Zahlung serverseitig bestätigen und die volle Analyse liefern. */
export async function confirmPayment(id: string, sessionId: string): Promise<AnalysisResult | null> {
  if (!Id.safeParse(id).success) return null;
  await confirmSession(sessionId);
  return loadAnalysis(id);
}

export async function removeAnalysis(id: string): Promise<boolean> {
  if (!Id.safeParse(id).success) return false;
  return deleteAnalysis(id, (await currentUser())?.id ?? null);
}
