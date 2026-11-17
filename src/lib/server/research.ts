import "server-only";
import { serviceDb } from "./forum-admin";
import { getProvider, webSearchEnabled } from "../ai/provider";
import type { ResearchEntry, Source, Vehicle } from "../types";

const STALE_MS = 365 * 864e5;

/** Gespeicherte Recherche zu diesem Typ (auch eine ältere, bis die neue fertig ist). */
export async function getResearch(key: string): Promise<(ResearchEntry & { stale: boolean }) | null> {
  const { data } = (await serviceDb()?.from("model_research").select("label, identified_as, weak_points, sources, researched_at").eq("key", key).not("weak_points", "is", null).maybeSingle()) ?? { data: null };
  if (!data?.researched_at) return null;
  return {
    label: data.label ?? "",
    identifiedAs: data.identified_as ?? data.label ?? "",
    weakPoints: data.weak_points,
    sources: (data.sources as Source[]) ?? [],
    researchedAt: data.researched_at,
    stale: Date.now() - new Date(data.researched_at).getTime() > STALE_MS,
  };
}

/**
 * Googles Belegt-Links sind Weiterleitungen (vertexaisearch.cloud.google.com), die ablaufen können – vor dem Speichern
 * auf die echte Seite auflösen. Nur diese eine Google-Adresse wird abgerufen (kein beliebiger Abruf), je Website ein Link.
 */
export async function resolveSources(list: Source[]): Promise<Source[]> {
  const resolved = await Promise.all(
    list.map(async (s): Promise<Source> => {
      try {
        const u = new URL(s.url ?? "");
        if (u.protocol !== "https:" || u.hostname !== "vertexaisearch.cloud.google.com") return s;
        const res = await fetch(u, { redirect: "manual", signal: AbortSignal.timeout(5000) });
        const loc = res.headers.get("location");
        return loc && loc.startsWith("https://") ? { label: new URL(loc).hostname.replace(/^www\./, ""), url: loc } : s;
      } catch {
        return s;
      }
    }),
  );
  const seen = new Set<string>();
  return resolved.filter((s) => !seen.has(s.label) && Boolean(seen.add(s.label)));
}

/** Recherche einmal durchführen und speichern. Läuft nach der Antwort im Hintergrund; nie doppelt für denselben Typ. */
export async function runResearch(key: string, label: string, vehicle: Vehicle) {
  const db = serviceDb();
  const ai = await getProvider();
  if (!db || !ai || !webSearchEnabled()) return;
  const { data: claimed } = await db.rpc("claim_research", { p_key: key, p_label: label });
  if (claimed !== true) return;
  try {
    const { research, sources: raw } = await ai.research(vehicle, label);
    const sources = await resolveSources(raw);
    // Ohne Belege aus der Suche speichern wir nichts – sonst wäre es nur eine ungeprüfte KI-Vermutung für alle späteren Nutzer
    if (!sources.length || !research.weakPoints.length) throw new Error(`keine belegten Schwachstellen (${sources.length} Quellen)`);
    await db
      .from("model_research")
      .update({ status: "fertig", identified_as: research.identifiedAs.slice(0, 300), weak_points: research.weakPoints.slice(0, 8), sources, model: ai.name, researched_at: new Date().toISOString() })
      .eq("key", key);
  } catch (e) {
    console.error("research failed", key, (e as Error).message);
    await db.from("model_research").update({ status: "fehler" }).eq("key", key);
  }
}
