import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";
import { KNOWLEDGE } from "@/lib/analysis/knowledge";

export default function sitemap(): MetadataRoute.Sitemap {
  const pages = ["", "/forum", "/forum/regeln", "/schwachstellen", "/finder", "/wert", "/vergleich", "/melden", "/methodik", "/datenschutz", "/impressum"];
  return [...pages, ...KNOWLEDGE.map((e) => `/schwachstellen/${e.id}`)].map((p) => ({ url: `${SITE_URL}${p}` }));
}
