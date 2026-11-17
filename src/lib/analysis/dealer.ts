/**
 * Händler-Check aus der öffentlichen Kleinanzeigen-Inseratsseite: wie lange aktiv, wie viele Autos online,
 * ob ein vollständiges Impressum (Firma, Anschrift, Handelsregister, USt-ID) angegeben ist.
 * Nur für gewerbliche Verkäufer – bei Privatleuten sagen diese Angaben wenig aus.
 */

export type DealerInfo = {
  name: string;
  city: string | null;
  since: string | null; // TT.MM.JJJJ
  adsOnline: number | null;
  register: string | null; // z. B. "HRB 1234, Amtsgericht Musterstadt"
  vatId: boolean;
  hasAddress: boolean;
  profileUrl: string | null;
};

export type DealerCheck = DealerInfo & {
  verdict: "solide" | "pruefen" | "vorsicht";
  points: { ok: boolean; text: string }[];
  reviewsUrl: string;
};

const decode = (s: string) =>
  s.replace(/&#x2F;/gi, "/").replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#39;|&#x27;/g, "'").replace(/&nbsp;/g, " ");
const textOf = (html: string) => decode(html.replace(/<br\s*\/?>/gi, "\n").replace(/<[^>]+>/g, " ")).replace(/[ \t]+/g, " ");

/** null = kein gewerblicher Verkäufer oder kein Kleinanzeigen-Verkäuferkasten. */
export function parseKaDealer(html: string): DealerInfo | null {
  const box = html.slice(Math.max(0, html.indexOf('id="viewad-contact"')), html.indexOf('id="viewad-contact"') + 6000);
  if (!html.includes('id="viewad-contact"') || !/Gewerblicher Nutzer/.test(box)) return null;
  const imprintMatch = html.match(/id="viewad-imprint-text"[^>]*>([\s\S]*?)<\/p>/);
  const imprint = imprintMatch ? textOf(imprintMatch[1]) : "";
  const lines = imprint.split("\n").map((l) => l.trim()).filter(Boolean);
  const contactName = textOf(box.match(/class="[^"]*userprofile-vip"[^>]*>\s*<a[^>]*>([\s\S]*?)<\/a>/)?.[1] ?? "").trim();
  const since = box.match(/Aktiv seit (\d{2}\.\d{2}\.\d{4})/)?.[1] ?? null;
  const ads = box.match(/(\d[\d.]*)\s+Anzeigen? online/)?.[1];
  const zip = imprint.match(/(?:DE-)?\b(\d{5})\s+([A-ZÄÖÜ][\wäöüßÄÖÜ .-]+)/);
  const hr = imprint.match(/\b(HR[AB])\s*[.:]?\s*(?:Nr\.?\s*)?(\d+\s?[A-Z]?)\b/);
  const court = imprint.match(/Amtsgericht\s+([A-ZÄÖÜ][\wäöüßÄÖÜ -]+?)(?:\n|,|$)/);
  const profile = box.match(/href="(\/s-bestandsliste\.html\?userId=\d+)"/)?.[1];
  return {
    name: lines[0] || contactName || "Händler",
    city: zip ? zip[2].trim() : null,
    since,
    adsOnline: ads ? Number(ads.replace(/\./g, "")) : null,
    register: hr ? `${hr[1]} ${hr[2].trim()}${court ? `, Amtsgericht ${court[1].trim()}` : ""}` : null,
    vatId: /\bDE\s?\d{9}\b/.test(imprint),
    hasAddress: Boolean(zip),
    profileUrl: profile ? `https://www.kleinanzeigen.de${profile}` : null,
  };
}

/** Übersichtliche Einschätzung aus den Angaben – keine Aussage über die Ehrlichkeit des Händlers, nur über Transparenz. */
export function rateDealer(d: DealerInfo, now = new Date()): DealerCheck {
  const points: DealerCheck["points"] = [];
  let strong = 0;
  let weak = 0;
  const good = (text: string) => points.push({ ok: true, text });
  const bad = (level: "strong" | "weak", text?: string) => {
    if (level === "strong") strong++;
    else weak++;
    if (text) points.push({ ok: false, text });
  };
  const [dd, mm, yyyy] = (d.since ?? "").split(".").map(Number);
  const years = d.since ? (now.getTime() - new Date(yyyy, mm - 1, dd).getTime()) / (365.25 * 864e5) : null;
  if (years === null) bad("weak", "Seit wann der Händler auf Kleinanzeigen ist, ist nicht angegeben");
  else if (years < 1) bad("strong", `Erst seit ${d.since} auf Kleinanzeigen – sehr neues Händlerkonto`);
  else good(`Seit ${Math.floor(years)} ${Math.floor(years) === 1 ? "Jahr" : "Jahren"} auf Kleinanzeigen (seit ${d.since})`);

  if (d.adsOnline === null) bad("weak");
  else if (d.adsOnline < 3) bad("weak", `Nur ${d.adsOnline} ${d.adsOnline === 1 ? "Anzeige" : "Anzeigen"} online – für einen Händler ungewöhnlich wenig`);
  else good(`${d.adsOnline} Anzeigen online`);

  if (!d.hasAddress) bad("strong", "Kein Impressum mit Anschrift – für gewerbliche Verkäufer Pflicht");
  else good(`Impressum mit Anschrift${d.city ? ` in ${d.city}` : ""}`);

  if (d.register) good(`Im Handelsregister eingetragen (${d.register})`);
  if (d.vatId) good("Umsatzsteuer-ID angegeben");
  if (!d.register && !d.vatId && d.hasAddress) bad("weak", "Weder Handelsregister noch Umsatzsteuer-ID im Impressum");

  return {
    ...d,
    verdict: strong ? "vorsicht" : weak ? "pruefen" : "solide",
    points,
    reviewsUrl: `https://www.google.com/search?q=${encodeURIComponent(`${d.name}${d.city ? ` ${d.city}` : ""} Bewertungen`)}`,
  };
}
