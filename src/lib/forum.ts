/** Suchbegriffe fürs Forum: max. 5 Wörter, je 2–40 Zeichen; % und _ werden für ILIKE maskiert. */
export function searchTerms(q: string): string[] {
  const words = q.toLowerCase().split(/\s+/).map((w) => w.replace(/[^\p{L}\p{N}.\-/+]/gu, "").slice(0, 40));
  return [...new Set(words.filter((w) => w.length >= 2))].slice(0, 5);
}

/** ILIKE-Muster für ein Wort (Teilwort-Suche: "getriebe" findet "Getriebeschaden"). */
export const likePattern = (w: string) => `%${w.replace(/[\\%_]/g, (c) => `\\${c}`)}%`;

/** Ausschnitt um den ersten Treffer, damit man sieht, warum ein Beitrag gefunden wurde. */
export function snippet(text: string, terms: string[], len = 160): string {
  const lower = text.toLowerCase();
  const hit = Math.min(...terms.map((t) => lower.indexOf(t)).filter((i) => i >= 0), Infinity);
  const start = hit === Infinity ? 0 : Math.max(0, hit - 50);
  const out = text.slice(start, start + len).replace(/\s+/g, " ").trim();
  return (start > 0 ? "… " : "") + out + (start + len < text.length ? " …" : "");
}

/** Profilbild-URL im öffentlichen Supabase-Speicher, oder null. */
export const avatarUrl = (path: string | null | undefined) =>
  path && process.env.NEXT_PUBLIC_SUPABASE_URL ? `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/avatars/${path}` : null;
