import "server-only";
import { serviceDb } from "./forum-admin";
import type { AnalysisResult } from "../types";
import { freeView } from "../analysis/premium";
import { premiumEnabled } from "./payments";

const ANON_DAYS = 90;

/** Speichert die Analyse serverseitig. Fehler stoppen die Analyse nicht (der Browser hat sie ohnehin). */
export async function storeAnalysis(result: AnalysisResult, userId: string | null) {
  const db = serviceDb();
  if (!db) return;
  const { error } = await db.from("analyses").insert({ id: result.id, user_id: userId, result });
  if (error) console.error("analysis store failed", error.message);
}

export async function getAnalysis(id: string): Promise<{ result: AnalysisResult; userId: string | null; premium: boolean } | null> {
  const { data } = (await serviceDb()?.from("analyses").select("result, user_id, premium_at").eq("id", id).maybeSingle()) ?? { data: null };
  return data ? { result: data.result as AnalysisResult, userId: data.user_id, premium: Boolean(data.premium_at) } : null;
}

/** Was der Besucher sehen darf: ohne Bezahlschranke oder nach Zahlung alles, sonst die kostenlose Fassung. */
export const visible = (result: AnalysisResult, premium: boolean) => (premiumEnabled() && !premium ? freeView(result) : result);

/** Ohne Konto darf löschen, wer den Link hat; mit Konto nur der Besitzer. */
export async function deleteAnalysis(id: string, userId: string | null): Promise<boolean> {
  const db = serviceDb();
  const row = await getAnalysis(id);
  if (!db || !row) return true;
  if (row.userId && row.userId !== userId) return false;
  const { error } = await db.from("analyses").delete().eq("id", id);
  return !error;
}

/** Analysen ohne Konto nach 90 Tagen löschen (täglicher Cron). */
export async function cleanupAnalyses() {
  const { count } = (await serviceDb()
    ?.from("analyses")
    .delete({ count: "exact" })
    .is("user_id", null)
    .lt("created_at", new Date(Date.now() - ANON_DAYS * 864e5).toISOString())) ?? { count: 0 };
  return count ?? 0;
}
