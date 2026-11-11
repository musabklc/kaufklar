import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";

export default function sitemap(): MetadataRoute.Sitemap {
  return ["", "/vergleich", "/melden", "/methodik", "/datenschutz", "/impressum"].map((p) => ({ url: `${SITE_URL}${p}` }));
}
