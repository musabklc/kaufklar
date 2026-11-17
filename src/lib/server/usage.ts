import "server-only";
import { serviceDb } from "./forum-admin";

export type UsageEvent = {
  kind: "ai" | "analyze" | "extract";
  op?: string;
  model?: string;
  ok: boolean;
  ms?: number;
  inputTokens?: number;
  outputTokens?: number;
  error?: string;
};

/** Protokolliert ohne Personendaten (keine IP, keine Inhalte). Fehler beim Protokollieren stoppen nie die Anfrage. */
export async function logEvent(e: UsageEvent) {
  const db = serviceDb();
  if (!db) return;
  const { error } = await db.from("usage_events").insert({
    kind: e.kind,
    op: e.op?.slice(0, 40),
    model: e.model?.slice(0, 60),
    ok: e.ok,
    ms: e.ms === undefined ? null : Math.round(e.ms),
    input_tokens: e.inputTokens ?? null,
    output_tokens: e.outputTokens ?? null,
    error: e.error?.slice(0, 300),
  });
  if (error) console.error("usage log failed", error.message);
}

/** Tagesbudget für KI-Aufrufe über alle Nutzer (AI_DAILY_LIMIT, Standard 500). Ohne Datenbank: kein Limit. */
export async function aiBudgetExceeded() {
  const db = serviceDb();
  if (!db) return false;
  const limit = Number(process.env.AI_DAILY_LIMIT) || 500;
  const since = new Date();
  since.setUTCHours(0, 0, 0, 0);
  const { count, error } = await db.from("usage_events").select("id", { count: "exact", head: true }).eq("kind", "ai").gte("at", since.toISOString());
  if (error) return console.error("budget check failed", error.message), false;
  return (count ?? 0) >= limit;
}
