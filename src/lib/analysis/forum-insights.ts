import type { Vehicle } from "../types.ts";

export type InsightRow = {
  post_id: number;
  thread_id: number;
  author_id: string | null;
  make: string;
  model: string;
  engine_code: string | null;
  year: number | null;
  kind: "schwachstelle" | "pluspunkt";
  title: string;
  component: string;
  mileage_km: number | null;
  cost_eur: number | null;
};

export type ForumInsight = {
  kind: "schwachstelle" | "pluspunkt";
  title: string;
  component: string;
  /** verschiedene Forennutzer, die das berichten */
  people: number;
  typicalKm: number | null;
  medianCost: number | null;
  /** bis zu 3 Beiträge zum Nachlesen */
  posts: { threadId: number; postId: number }[];
};

const clean = (s: string) => s.toLowerCase().replace(/[\s-]+/g, "").replace(/klasse$/, "");
/** Einheitlicher Markenschlüssel zum Speichern und Suchen ("Mercedes-Benz" = "mercedes", "Volkswagen" = "vw"). */
export const makeKey = (s: string) => clean(s).replace(/^mercedes(benz)?$/, "mercedes").replace(/^(vw|volkswagen)$/, "vw");

/** "CLS" = "CLS-Klasse", "3er" = "3er Touring", "Golf" = "Golf VII" – aber nicht "A4" = "A40". */
export function sameModel(a: string, b: string): boolean {
  const x = clean(a);
  const y = clean(b);
  if (!x || !y) return false;
  if (x === y) return true;
  const [short, long] = x.length < y.length ? [x, y] : [y, x];
  return long.startsWith(short) && !/\d/.test(long[short.length]);
}

export const sameMake = (a: string, b: string) => makeKey(a) === makeKey(b);

const median = (xs: number[]) => {
  if (!xs.length) return null;
  const s = [...xs].sort((a, b) => a - b);
  return s[Math.floor((s.length - 1) / 2)];
};

/** Forum-Erfahrungen, die zu diesem Auto passen, nach Titel zusammengefasst; je Art höchstens 6. */
export function aggregateInsights(rows: InsightRow[], v: Vehicle, year: number | null): ForumInsight[] {
  if (!v.make || !v.model) return [];
  const code = v.engineCode?.toUpperCase().replace(/\s/g, "");
  const groups = new Map<string, InsightRow[]>();
  for (const r of rows) {
    if (!sameMake(r.make, v.make) || !sameModel(r.model, v.model)) continue;
    // Anderer Motor oder deutlich andere Generation: gehört nicht zu diesem Auto
    if (code && r.engine_code && r.engine_code.toUpperCase().replace(/\s/g, "") !== code) continue;
    if (year && r.year && Math.abs(r.year - year) > 4) continue;
    const key = `${r.kind}|${r.title.toLowerCase().replace(/\s+/g, " ").trim()}`;
    groups.set(key, [...(groups.get(key) ?? []), r]);
  }
  const out: ForumInsight[] = [];
  for (const list of groups.values()) {
    const posts = [...new Map(list.map((r) => [r.post_id, { threadId: r.thread_id, postId: r.post_id }])).values()];
    out.push({
      kind: list[0].kind,
      title: list[0].title,
      component: list[0].component,
      people: new Set(list.map((r) => r.author_id ?? `post${r.post_id}`)).size,
      typicalKm: median(list.map((r) => r.mileage_km).filter((x): x is number => !!x && x > 0)),
      medianCost: median(list.map((r) => r.cost_eur).filter((x): x is number => !!x && x > 0)),
      posts: posts.slice(0, 3),
    });
  }
  out.sort((a, b) => b.people - a.people || b.posts.length - a.posts.length);
  return [...out.filter((i) => i.kind === "schwachstelle").slice(0, 6), ...out.filter((i) => i.kind === "pluspunkt").slice(0, 6)];
}
