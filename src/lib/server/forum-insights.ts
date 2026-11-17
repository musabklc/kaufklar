import "server-only";
import { createClient } from "@supabase/supabase-js";
import { getProvider } from "../ai/provider";
import { parseYear } from "../analysis/knowledge";
import { aggregateInsights, makeKey, type ForumInsight, type InsightRow } from "../analysis/forum-insights";
import type { Vehicle } from "../types";

const db = process.env.SUPABASE_URL && process.env.SUPABASE_SECRET_KEY ? createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SECRET_KEY, { auth: { persistSession: false } }) : null;

const int = (n: number | null, max: number) => (n !== null && Number.isFinite(n) && n > 0 && n <= max ? Math.round(n) : null);

/** Liest einen Beitrag mit KI und speichert die Erfahrungen daraus. Fehler werden nur geloggt – der Beitrag ist ja schon gespeichert. */
export async function classifyPost(postId: number): Promise<number> {
  const ai = await getProvider();
  if (!db || !ai) return 0;
  const { data: post } = await db
    .from("forum_posts")
    .select("id, body, hidden, author_id, thread:forum_threads(id, title, board:forum_boards(title)), author:profiles(car)")
    .eq("id", postId)
    .maybeSingle();
  if (!post) return 0;
  const thread = post.thread as unknown as { id: number; title: string; board: { title: string } | null } | null;
  const car = (post.author as unknown as { car: string | null } | null)?.car ?? null;
  let rows: Omit<InsightRow, "post_id">[] = [];
  if (!post.hidden && thread) {
    try {
      const out = await ai.forumInsights({ board: thread.board?.title ?? "", threadTitle: thread.title, authorCar: car, body: post.body });
      rows = out.items
        .filter((i) => i.make.trim() && i.model.trim() && i.title.trim().length >= 3)
        .slice(0, 5)
        .map((i) => ({
          thread_id: thread.id,
          author_id: post.author_id,
          make: makeKey(i.make.trim()),
          model: i.model.trim().slice(0, 40),
          engine_code: i.engineCode?.trim().slice(0, 12) || null,
          year: int(i.year, 2100),
          kind: i.kind,
          title: i.title.trim().slice(0, 80),
          component: i.component,
          mileage_km: int(i.mileageKm, 2_000_000),
          cost_eur: int(i.costEur, 200_000),
        }));
    } catch (e) {
      console.warn("forum insights: KI nicht erreichbar", postId, (e as Error).message);
      return 0; // insights_at bleibt leer → der Cron versucht es später erneut
    }
  }
  await db.from("forum_insights").delete().eq("post_id", postId);
  if (rows.length) {
    const { error } = await db.from("forum_insights").insert(rows.map((r) => ({ ...r, post_id: postId })));
    if (error) console.warn("forum insights: speichern fehlgeschlagen", error.message);
  }
  await db.from("forum_posts").update({ insights_at: new Date().toISOString() }).eq("id", postId);
  return rows.length;
}

/** Noch nicht gelesene Beiträge nachholen (Cron). */
export async function classifyPending(limit: number) {
  if (!db) return { posts: 0, insights: 0 };
  const { data } = await db.from("forum_posts").select("id").is("insights_at", null).order("created_at").limit(limit);
  let insights = 0;
  for (const p of data ?? []) insights += await classifyPost(p.id);
  return { posts: data?.length ?? 0, insights };
}

/** Forum-Erfahrungen zu diesem Auto; ausgeblendete (gemeldete) Beiträge zählen nicht. */
export async function forumInsightsFor(v: Vehicle): Promise<ForumInsight[]> {
  if (!db || !v.make || !v.model) return [];
  const { data, error } = await db
    .from("forum_insights")
    .select("post_id, thread_id, author_id, make, model, engine_code, year, kind, title, component, mileage_km, cost_eur, post:forum_posts!inner(hidden)")
    .eq("make", makeKey(v.make))
    .eq("post.hidden", false)
    .limit(3000);
  if (error) {
    console.warn("forum insights lookup failed", error.message);
    return [];
  }
  return aggregateInsights((data ?? []) as unknown as InsightRow[], v, parseYear(v.firstRegistration));
}
