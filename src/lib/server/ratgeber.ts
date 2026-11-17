import "server-only";
import { serviceDb } from "./forum-admin";
import type { Research, Source } from "../types";

export type Guide = { slug: string; label: string; identifiedAs: string; weakPoints: Research["weakPoints"]; sources: Source[]; researchedAt: string };

// Nur gehaltvolle Recherchen werden öffentliche Seiten – dünne Seiten schaden dem Ranking der ganzen Domain
const publishable = (r: { weak_points: unknown; sources: unknown; researched_at: string | null }) =>
  Array.isArray(r.weak_points) && r.weak_points.length >= 3 && Array.isArray(r.sources) && r.sources.length >= 2 && Boolean(r.researched_at);

const COLS = "slug, label, identified_as, weak_points, sources, researched_at";
type Row = { slug: string; label: string | null; identified_as: string | null; weak_points: Research["weakPoints"] | null; sources: Source[]; researched_at: string | null };
const toGuide = (r: Row): Guide => ({ slug: r.slug, label: r.label ?? r.slug, identifiedAs: r.identified_as ?? "", weakPoints: r.weak_points ?? [], sources: r.sources ?? [], researchedAt: r.researched_at! });

/** Alle veröffentlichten Ratgeber, alphabetisch. */
export async function listGuides(): Promise<Guide[]> {
  const { data } = (await serviceDb()?.from("model_research").select(COLS).not("weak_points", "is", null).order("label").limit(2000)) ?? { data: null };
  return ((data ?? []) as Row[]).filter(publishable).map(toGuide);
}

export async function getGuide(slug: string): Promise<Guide | null> {
  if (!/^[a-z0-9-]{3,160}$/.test(slug)) return null;
  const { data } = (await serviceDb()?.from("model_research").select(COLS).eq("slug", slug).maybeSingle()) ?? { data: null };
  return data && publishable(data as Row) ? toGuide(data as Row) : null;
}
