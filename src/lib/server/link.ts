import "server-only";

import { LinkError, validateListingUrl } from "../guards";

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

  let res: Response | null = null;
  for (let hop = 0; hop < 3; hop++) {
    res = await fetch(url, {
      redirect: "manual",
      signal: AbortSignal.timeout(10_000),
      headers: { "user-agent": "Mozilla/5.0 (compatible; Kaufklar/1.0)", "accept-language": "de-DE,de;q=0.9" },
    });
    const loc = res.headers.get("location");
    if (res.status >= 300 && res.status < 400 && loc) {
      url = validateListingUrl(new URL(loc, url).toString()); // Redirects nur innerhalb der erlaubten Hosts (SSRF-Schutz)
      continue;
    }
    break;
  }
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
