import { parseYear } from "./knowledge.ts";
import type { Vehicle } from "../types.ts";

/** Marktcheck: Treffer der KI-Recherche (Google) prüfen und den Angebotspreis einordnen. */

type Listing = { title: string; priceEur: number; year: number | null; mileageKm: number | null; url: string };

const PORTALS = /(^|\.)(mobile\.de|autoscout24\.(de|at|com)|kleinanzeigen\.de|heycar\.com|pkw\.de|autohero\.com|carwow\.de|meinauto\.de|automobile\.de)$/;

const portalUrl = (raw: string) => {
  try {
    const u = new URL(raw);
    return u.protocol === "https:" && PORTALS.test(u.hostname) ? u.toString() : "";
  } catch {
    return "";
  }
};

/** Nur vergleichbare Angebote: Baujahr ±2, km ±40 %, plausibler Preis, keine Dubletten. Links nur zu echten Portalen. */
export function plausibleListings(list: Listing[], v: Pick<Vehicle, "firstRegistration" | "mileageKm">): Listing[] {
  const year = parseYear(v.firstRegistration);
  const km = v.mileageKm;
  const seen = new Set<string>();
  return list
    .filter((l) => {
      const key = `${l.priceEur}|${l.mileageKm}|${l.year}`;
      const ok =
        l.priceEur >= 500 &&
        l.priceEur <= 500000 &&
        (year === null || l.year === null || Math.abs(l.year - year) <= 2) &&
        (km === null || l.mileageKm === null || Math.abs(l.mileageKm - km) <= km * 0.4) &&
        !seen.has(key);
      seen.add(key);
      return ok;
    })
    .map((l) => ({ ...l, url: portalUrl(l.url) }));
}

export type PriceVerdict = { label: string; tone: "ok" | "warn" | "bad"; detail: string };

/** Angebot gegen den Median vergleichbarer Angebote. */
export function priceVerdict(asking: number | null, median: number | null): PriceVerdict | null {
  if (asking === null || !median) return null;
  const pct = Math.round((asking / median - 1) * 100);
  const diff = `${Math.abs(pct)} % ${pct < 0 ? "unter" : "über"} dem Marktschnitt`;
  if (pct < -20) return { label: "Auffällig günstig", tone: "warn", detail: `${diff}. Grund klären (Mängel, Eile) – niemals Vorkasse ohne Besichtigung.` };
  if (pct <= 5) return { label: "Gut eingepreist", tone: "ok", detail: pct < -2 ? `${diff}.` : "Liegt im Marktschnitt." };
  if (pct <= 15) return { label: "Etwas teuer", tone: "warn", detail: `${diff} – Verhandlungsspielraum nutzen.` };
  return { label: "Zu teuer", tone: "bad", detail: `${diff}.` };
}

/** Preis aus einer Inseratsseite (Schema.org-Angabe in Meta-Tag oder JSON-LD). */
export function pagePrice(html: string): number | null {
  const m = html.match(/itemprop="price"[^>]*content="(\d+(?:\.\d+)?)"/i) ?? html.match(/"price"\s*:\s*"?(\d+(?:\.\d+)?)/);
  const p = m ? Math.round(Number(m[1])) : null;
  return p !== null && p >= 500 && p <= 500000 ? p : null;
}
