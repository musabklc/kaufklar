import "server-only";

import { LinkError, validateListingUrl } from "../guards";
import { kaSearchUrl, pagePrice, pageSeller, parseKaSearch, plausibleListings, sameKind, vehicleText } from "../analysis/market";
import { parseYear } from "../analysis/knowledge";
import type { Vehicle } from "../types";
import type { WebListing } from "../ai/provider";
import { parseKaDealer, rateDealer, type DealerCheck } from "../analysis/dealer";

export { LinkError };

const MAX_BYTES = 3_000_000;

/**
 * Lädt die öffentliche Inseratsseite und reduziert sie auf lesbaren Text + strukturierte Daten.
 * Viele Portale blockieren automatisierte Abrufe – dann greift der Screenshot-Workflow.
 */
export async function fetchListingText(raw: string): Promise<string> {
  if (process.env.LINK_IMPORT_ENABLED !== "true")
    throw new LinkError("Der automatische Link-Import ist deaktiviert. Bitte lade Screenshots des Inserats hoch.", "DISABLED");
  let url = validateListingUrl(raw);
  // mobile.de blockt automatische Abrufe bewusst – das respektieren wir und leiten direkt zum Screenshot-Weg.
  if (url.hostname.endsWith("mobile.de"))
    throw new LinkError("mobile.de erlaubt keinen automatischen Abruf. Mach im Inserat 1–3 Screenshots (Fahrzeugdaten und Beschreibung) und lade sie hier hoch – das dauert etwa 20 Sekunden.", "BLOCKED");

  const { res, url: finalUrl } = await fetchPage(url);
  url = finalUrl;
  if (!res || !res.ok) throw new LinkError("Das Portal hat den Abruf blockiert. Bitte lade stattdessen Screenshots des Inserats hoch.", "BLOCKED");

  const html = (await res.text()).slice(0, MAX_BYTES);
  const jsonLd = [...html.matchAll(/<script[^>]+application\/ld\+json[^>]*>([\s\S]*?)<\/script>/gi)].map((m) => m[1].trim()).join("\n");
  const meta = [...html.matchAll(/<meta[^>]+(?:property|name)="(og:title|og:description|description)"[^>]+content="([^"]*)"/gi)]
    .map((m) => `${m[1]}: ${m[2]}`)
    .join("\n");
  const body = html
    .replace(/<(script|style|noscript|svg)[\s\S]*?<\/\1>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim();

  // Captcha-/Bot-Seiten liefern kaum Inhalt.
  if (body.length < 400 || /captcha|access denied|zugriff verweigert|are you a robot/i.test(body.slice(0, 2000)))
    throw new LinkError("Das Portal hat den Abruf blockiert. Bitte lade stattdessen Screenshots des Inserats hoch.", "BLOCKED");

  // shortcut: Seitentext wird auf 60k Zeichen begrenzt; reicht für Inserate, bei sehr langen Seiten ggf. gezielter parsen.
  return `URL: ${url}\n${meta}\n${jsonLd ? `JSON-LD:\n${jsonLd.slice(0, 20000)}\n` : ""}Seitentext:\n${body.slice(0, 60000)}`;
}

/** Preisalarm: Ist das Inserat noch online, und was kostet es jetzt? null = nicht feststellbar (blockiert, Zeitüberschreitung). */
export async function checkListing(raw: string): Promise<{ gone: boolean; price: number | null } | null> {
  let url: URL;
  try {
    url = validateListingUrl(raw);
  } catch {
    return null;
  }
  if (url.hostname.endsWith("mobile.de")) return null; // blockt automatische Abrufe – respektieren
  try {
    const { res, url: finalUrl } = await fetchPage(url);
    if (!res) return null;
    if (res.status === 404 || res.status === 410) return { gone: true, price: null };
    // Portale leiten gelöschte Inserate gern auf eine Suchseite um
    if (/\/(s-autos|lst|suche)\b/.test(finalUrl.pathname) && finalUrl.pathname !== url.pathname) return { gone: true, price: null };
    if (!res.ok) return null;
    const html = (await res.text()).slice(0, MAX_BYTES);
    if (/Anzeige (ist )?nicht mehr verfügbar|Anzeige wurde (gelöscht|deaktiviert)|Inserat (ist )?nicht mehr (verfügbar|aktiv)|nicht mehr online/i.test(html)) return { gone: true, price: null };
    return { gone: false, price: pagePrice(html) };
  } catch {
    return null;
  }
}

/** Händler-Check: nur Kleinanzeigen-Inserate gewerblicher Verkäufer (Privatleute: null). */
export async function checkDealer(raw: string): Promise<DealerCheck | null> {
  let url: URL;
  try {
    url = validateListingUrl(raw);
  } catch {
    return null;
  }
  if (!url.hostname.endsWith("kleinanzeigen.de")) return null;
  const { res } = await fetchPage(url);
  if (!res?.ok) return null;
  const info = parseKaDealer((await res.text()).slice(0, MAX_BYTES));
  return info ? rateDealer(info) : null;
}

/** Lädt eine Seite; Redirects nur innerhalb der erlaubten Portale (SSRF-Schutz). */
async function fetchPage(start: URL): Promise<{ res: Response | null; url: URL }> {
  let url = start;
  let res: Response | null = null;
  for (let hop = 0; hop < 3; hop++) {
    res = await fetch(url, {
      redirect: "manual",
      signal: AbortSignal.timeout(10_000),
      headers: { "user-agent": "Mozilla/5.0 (compatible; Tachoklar/1.0)", "accept-language": "de-DE,de;q=0.9" },
    });
    const loc = res.headers.get("location");
    if (res.status >= 300 && res.status < 400 && loc) {
      url = validateListingUrl(new URL(loc, url).toString());
      continue;
    }
    break;
  }
  return { res, url };
}

/**
 * Gegenprüfung der KI-Recherche: Jedes gefundene Inserat wird geöffnet und der echte Preis von der Seite übernommen.
 * Was sich nicht prüfen lässt (mobile.de blockt bewusst, Seite weg, anderes Modell), fällt raus.
 */
export async function verifyListings(list: WebListing[], make: string | null): Promise<WebListing[]> {
  const checked = await Promise.all(
    list.slice(0, 20).map(async (l): Promise<WebListing | null> => {
      try {
        const url = validateListingUrl(l.url);
        if (url.hostname.endsWith("mobile.de")) return null;
        const { res } = await fetchPage(url);
        if (!res?.ok) return null;
        const html = (await res.text()).slice(0, MAX_BYTES);
        // Gegen erfundene Links: die Seite muss die Marke nennen ("Mercedes-Benz" -> "mercedes")
        if (make && !html.toLowerCase().includes(make.toLowerCase().split(/[\s-]/)[0])) return null;
        const price = pagePrice(html);
        return price ? { ...l, priceEur: price, seller: pageSeller(html) } : null;
      } catch {
        return null;
      }
    }),
  );
  const seen = new Set<string>();
  return checked.filter((l): l is WebListing => l !== null && !seen.has(l.url) && Boolean(seen.add(l.url)));
}

/**
 * Kleinanzeigen-Autosuche (robots.txt erlaubt /s-autos/): eine Trefferliste mit echten Preisen.
 * Erst genau (mit Motor), bei zu wenig passenden Treffern zusätzlich breiter (nur Marke und Modell).
 * Liefert die passendsten Angebote zuerst (Baujahr und km am nächsten am gesuchten Auto).
 */
export async function searchKleinanzeigen(v: Vehicle): Promise<WebListing[]> {
  const pull = async (url: string | null): Promise<WebListing[]> => {
    if (!url) return [];
    const { res } = await fetchPage(new URL(url));
    return res?.ok ? plausibleListings(parseKaSearch((await res.text()).slice(0, MAX_BYTES)), v) : [];
  };
  let found = await pull(kaSearchUrl(v));
  if (found.length < 8) found = [...found, ...(await pull(kaSearchUrl(v, false)))];
  // Gleiche Karosserie und, wenn genug da, gleiche Ausstattungslinie (M Sport, AMG Line, S line …)
  found = sameKind(found, vehicleText(v), (l) => l.title).list;
  const year = parseYear(v.firstRegistration);
  const dist = (l: WebListing) => (year && l.year ? Math.abs(l.year - year) : 1) + (v.mileageKm && l.mileageKm ? Math.abs(l.mileageKm - v.mileageKm) / 25000 : 1);
  return found.sort((a, b) => dist(a) - dist(b));
}
