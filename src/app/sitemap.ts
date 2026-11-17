import type { MetadataRoute } from "next";
import { cacheLife } from "next/cache";
import { SITE_URL } from "@/lib/site";
import { KNOWLEDGE } from "@/lib/analysis/knowledge";
import { forumEnabled, supabasePublic } from "@/lib/supabase/server";
import { listGuides } from "@/lib/server/ratgeber";

/** Unterforen und die zuletzt aktiven Themen – stündlich neu, damit neue Diskussionen schnell gefunden werden. */
async function forumUrls(): Promise<MetadataRoute.Sitemap> {
  "use cache";
  cacheLife("hours");
  if (!forumEnabled()) return [];
  const sb = supabasePublic();
  const [{ data: boards }, { data: threads }] = await Promise.all([
    sb.from("forum_boards").select("id"),
    sb.from("forum_threads").select("id, last_post_at").gt("post_count", 0).order("last_post_at", { ascending: false }).limit(1000),
  ]);
  return [
    ...(boards ?? []).map((b) => ({ url: `${SITE_URL}/forum/${b.id}` })),
    ...(threads ?? []).map((t) => ({ url: `${SITE_URL}/forum/thema/${t.id}`, lastModified: t.last_post_at })),
  ];
}

/** Ratgeber aus der Recherche-Datenbank. */
async function guideUrls(): Promise<MetadataRoute.Sitemap> {
  "use cache";
  cacheLife("hours");
  return (await listGuides()).map((g) => ({ url: `${SITE_URL}/ratgeber/${g.slug}`, lastModified: g.researchedAt }));
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const pages = ["", "/forum", "/forum/regeln", "/schwachstellen", "/finder", "/wert", "/melden", "/methodik", "/datenschutz", "/impressum"];
  return [
    ...[...pages, ...KNOWLEDGE.map((e) => `/schwachstellen/${e.id}`)].map((p) => ({ url: `${SITE_URL}${p}` })),
    ...(await guideUrls().catch(() => [])),
    ...(await forumUrls().catch(() => [])),
  ];
}
