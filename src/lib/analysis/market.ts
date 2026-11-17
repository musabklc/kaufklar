import { parseYear } from "./knowledge.ts";
import type { Vehicle } from "../types.ts";

/** Marktcheck: Treffer der KI-Recherche (Google) prüfen und den Angebotspreis einordnen. */

type Listing = { title: string; priceEur: number; year: number | null; mileageKm: number | null; url: string };

const PORTALS = /(^|\.)(mobile\.de|autoscout24\.(de|at|com)|kleinanzeigen\.de|heycar\.com|pkw\.de|autohero\.com|carwow\.de|meinauto\.de|automobile\.de)$/;

/** Einheitlicher Link je Inserat, damit dasselbe Inserat mit anderem Link-Text nicht doppelt zählt. */
export const canonicalUrl = (u: URL) => {
  const ka = u.hostname.endsWith("kleinanzeigen.de") && u.pathname.match(/^\/s-anzeige\/(?:.*\/)?(\d{6,})/);
  return ka ? `https://www.kleinanzeigen.de/s-anzeige/${ka[1]}` : `${u.origin}${u.pathname}`;
};

const portalUrl = (raw: string) => {
  try {
    const u = new URL(raw);
    return u.protocol === "https:" && PORTALS.test(u.hostname) ? canonicalUrl(u) : "";
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

/** Privat oder Händler laut Inseratsseite (Kleinanzeigen: posterType, AutoScout24: isDealer). Erste Angabe = das Inserat selbst. */
export function pageSeller(html: string): "privat" | "gewerblich" | null {
  const m = html.match(/posterType["']?\s*:\s*["'](PRIVATE|COMMERCIAL)|"isDealer"\s*:\s*(true|false)/);
  if (!m) return null;
  return m[1] === "COMMERCIAL" || m[2] === "true" ? "gewerblich" : "privat";
}

/** Preis aus einer Inseratsseite (Schema.org-Angabe in Meta-Tag oder JSON-LD). */
export function pagePrice(html: string): number | null {
  const m = html.match(/itemprop="price"[^>]*content="(\d+(?:\.\d+)?)"/i) ?? html.match(/"price"\s*:\s*"?(\d+(?:\.\d+)?)/);
  const p = m ? Math.round(Number(m[1])) : null;
  return p !== null && p >= 500 && p <= 500000 ? p : null;
}

// ---------- Kleinanzeigen-Suche (robots.txt erlaubt /s-autos/) ----------

const ENGINE = /^(tdi|tsi|tfsi|cdi|hdi|dci|crdi|cdti|d4d|ecoboost|multiair|puretech|bluehdi|e-?tron|hybrid)$/i;
const NUMERIC = /^(\d{3}[a-z]{0,2}|\d\.\d)$/i; // 320d, 500, 2.0
const SERIES = /^(\d(er)?|[a-z]-klasse|klasse)$/i; // "3er", "E-Klasse": stehen oft nicht im Inseratstitel

/** Suchbegriffe: Marke, Modell, Motor-Kennung aus der Variante. eng=false = breitere Suche nur nach Marke und Modell. */
export function kaQuery(v: Pick<Vehicle, "make" | "model" | "variant">, eng = true): string {
  const make = (v.make ?? "").toLowerCase().replace(/-benz$/, "");
  const tokens = (v.variant ?? "").toLowerCase().split(/[\s/]+/).filter(Boolean);
  const engine = eng ? [tokens.find((t) => NUMERIC.test(t)), tokens.find((t) => ENGINE.test(t))].filter(Boolean) as string[] : [];
  const model = (v.model ?? "").toLowerCase();
  // Coupé/Cabrio mitsuchen, sonst kommen fast nur die häufigeren Limousinen/SUVs
  const body = { Coupé: "coupe", Cabrio: "cabrio" }[bodyOf(v.variant ?? "") ?? ""] ?? "";
  const words = [make, ...(engine.length && SERIES.test(model) ? [] : model.split(/\s+/)), ...engine, body];
  return [...new Set(words.filter(Boolean))].map((w) => encodeURIComponent(w.replace(/\s+/g, "-"))).join("-");
}

const num = (s: string | undefined) => (s ? Number(s.replace(/\./g, "")) : null);

/** Trefferliste einer Kleinanzeigen-Autosuche: Titel, Preis, km, Erstzulassung, Link. Anzeigen ohne Preis fallen raus. */
export function parseKaSearch(html: string): Listing[] {
  return html
    .split('data-adid="')
    .slice(1)
    .map((chunk) => {
      const c = chunk.split("<article")[0];
      const href = c.match(/data-href="(\/s-anzeige\/[^"]+)"/)?.[1];
      const title = c.match(/<h3[^>]*>\s*<a[^>]*>([^<]+)<\/a>/)?.[1]?.replace(/&amp;/g, "&").trim();
      const text = c.replace(/<script[\s\S]*?<\/script>/g, " ").replace(/<[^>]+>/g, " ").replace(/&nbsp;| | /g, " ").replace(/\s+/g, " ");
      const price = num(text.match(/(\d{1,3}(?:\.\d{3})+|\d{3,6}) €/)?.[1]);
      const km = num(text.match(/(\d{1,3}(?:\.\d{3})+|\d{1,6}) km\b/)?.[1]);
      const year = num(text.match(/EZ \d{2}\/(\d{4})/)?.[1]);
      return href && title && price ? { title, priceEur: price, year, mileageKm: km, url: `https://www.kleinanzeigen.de${href}` } : null;
    })
    .filter((l): l is Listing => l !== null);
}

/** Such-URL mit Filtern für Baujahr ±2 und Kilometer ±40 % direkt bei Kleinanzeigen. */
export function kaSearchUrl(v: Pick<Vehicle, "make" | "model" | "variant" | "firstRegistration" | "mileageKm">, eng = true): string | null {
  const q = kaQuery(v, eng);
  if (!q) return null;
  const year = parseYear(v.firstRegistration);
  const f = [
    year ? `autos.ez_i:${year - 2}%2C${year + 2}` : "",
    v.mileageKm ? `autos.km_i:${Math.round(v.mileageKm * 0.6)}%2C${Math.round(v.mileageKm * 1.4)}` : "",
  ].filter(Boolean);
  return `https://www.kleinanzeigen.de/s-autos/${q}/k0c216${f.map((x) => `+${x}`).join("")}`;
}

// ---------- Karosserie und Ausstattungslinie (verändern den Preis deutlich) ----------

const BODIES: [string, RegExp][] = [
  ["Coupé", /coup[eé]/i],
  ["Cabrio", /cabrio|roadster|spyder|spider/i],
  ["Gran Turismo", /gran turismo|\bgt\b(?![\s-]?line)/i],
  ["Kombi", /touring|kombi|avant\b|variant\b|t-modell|sports ?tourer|estate|combi\b/i],
];
const TRIMS: [string, RegExp][] = [
  ["M Sport", /\bm[\s-]?sport|\bm-paket/i],
  ["AMG Line", /\bamg[\s-]?(line|paket|sport)/i],
  ["S line", /\bs[\s-]?line/i],
  ["R-Line", /\br[\s-]?line/i],
  ["ST-Line", /\bst[\s-]?line/i],
  ["GT Line", /\bgt[\s-]?line/i],
  ["N Line", /\bn[\s-]?line/i],
  ["FR", /\bfr\b/i],
];
export const bodyOf = (t: string) => BODIES.find(([, re]) => re.test(t))?.[0] ?? null;
export const trimOf = (t: string) => TRIMS.find(([, re]) => re.test(t))?.[0] ?? null;

/** Text, aus dem Karosserie und Ausstattungslinie des gesuchten Autos gelesen werden. */
export const vehicleText = (v: Pick<Vehicle, "variant" | "description" | "equipment">) => [v.variant, v.description, ...(v.equipment ?? [])].filter(Boolean).join(" ");

/**
 * Nur Angebote derselben Art: gleiche Karosserie (ein GLC Coupé nicht mit dem SUV vergleichen; ohne Angabe keine Coupés/Cabrios),
 * und dieselbe Ausstattungslinie, sobald mindestens 4 Angebote sie haben.
 */
export function sameKind<T>(list: T[], target: string, titleOf: (x: T) => string): { list: T[]; note: string | null } {
  const body = bodyOf(target);
  const trim = trimOf(target);
  let out = list.filter((x) => {
    const b = bodyOf(titleOf(x));
    return body ? b === body : b !== "Coupé" && b !== "Cabrio" && b !== "Gran Turismo";
  });
  const withTrim = trim ? out.filter((x) => trimOf(titleOf(x)) === trim) : [];
  if (withTrim.length >= 4) out = withTrim;
  const parts = [body && `nur ${body}-Angebote`, withTrim.length >= 4 && `nur mit ${trim}`].filter(Boolean);
  return { list: out, note: parts.length ? `Marktcheck: ${parts.join(", ")}.` : null };
}
