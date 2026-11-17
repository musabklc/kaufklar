import { Suspense } from "react";
import { connection } from "next/server";
import Link from "next/link";
import { notFound } from "next/navigation";
import { SearchForm } from "@/components/forum/search-form";
import { forumEnabled, supabaseUser } from "@/lib/supabase/server";
import { likePattern, searchTerms, snippet } from "@/lib/forum";

export const metadata = { title: "Forum durchsuchen – Tachoklar", robots: { index: false } };

type SP = Promise<Record<string, string | string[] | undefined>>;

export default function SuchePage({ searchParams }: { searchParams: SP }) {
  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6 lg:py-16">
      <Link href="/forum" className="text-sm font-medium text-brand">← Alle Foren</Link>
      <h1 className="mt-3 text-4xl font-semibold tracking-[-0.03em] sm:text-5xl">Forum durchsuchen</h1>
      <Suspense fallback={<div className="mt-8 h-64 animate-pulse rounded-3xl bg-card" />}>
        <Results searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

type Thread = { id: number; title: string; board_id: string; post_count: number; last_post_at: string };
const day = (d: string) => new Date(d).toLocaleDateString("de-DE", { timeZone: "Europe/Berlin" });

async function Results({ searchParams }: { searchParams: SP }) {
  await connection();
  if (!forumEnabled()) notFound();
  const raw = (await searchParams).q;
  const q = (typeof raw === "string" ? raw : "").slice(0, 100);
  const terms = searchTerms(q);
  if (!terms.length) {
    return (
      <>
        <SearchForm q={q} className="mt-8" />
        {q && <p className="mt-6">Bitte mindestens ein Wort mit 2 Zeichen eingeben.</p>}
      </>
    );
  }

  const sb = await supabaseUser();
  // Alle Wörter müssen vorkommen (UND); Teilwörter zählen. Ausgeblendete Beiträge filtert RLS.
  let threadQ = sb.from("forum_threads").select("id, title, board_id, post_count, last_post_at");
  let postQ = sb.from("forum_posts").select("body, thread:forum_threads(id, title, board_id, post_count, last_post_at)");
  for (const t of terms) {
    threadQ = threadQ.ilike("title", likePattern(t));
    postQ = postQ.ilike("body", likePattern(t));
  }
  const [{ data: byTitle }, { data: byBody }] = await Promise.all([
    threadQ.order("last_post_at", { ascending: false }).limit(30),
    postQ.order("created_at", { ascending: false }).limit(60),
  ]);

  const hits = new Map<number, { thread: Thread; excerpt: string | null }>();
  for (const t of byTitle ?? []) hits.set(t.id, { thread: t, excerpt: null });
  for (const p of byBody ?? []) {
    const thread = p.thread as unknown as Thread | null;
    if (!thread) continue;
    const hit = hits.get(thread.id);
    if (!hit) hits.set(thread.id, { thread, excerpt: snippet(p.body, terms) });
    else if (!hit.excerpt) hit.excerpt = snippet(p.body, terms);
  }
  const list = [...hits.values()].sort((a, b) => b.thread.last_post_at.localeCompare(a.thread.last_post_at)).slice(0, 40);

  return (
    <>
      <SearchForm q={q} className="mt-8" />
      <p className="mt-6 text-muted-foreground" role="status">
        {list.length ? `${list.length} ${list.length === 1 ? "Thema" : "Themen"} gefunden` : "Nichts gefunden. Versuch ein anderes Wort oder weniger Wörter."}
      </p>
      <ul className="mt-4 space-y-3">
        {list.map(({ thread, excerpt }) => (
          <li key={thread.id}>
            <Link href={`/forum/thema/${thread.id}`} className="block rounded-2xl bg-card px-5 py-4 transition-transform hover:-translate-y-0.5">
              <span className="font-semibold">{thread.title}</span>
              {excerpt && <span className="mt-1 block text-foreground/80">{excerpt}</span>}
              <span className="mt-2 block text-sm text-muted-foreground">
                {thread.post_count} {thread.post_count === 1 ? "Beitrag" : "Beiträge"} · zuletzt {day(thread.last_post_at)}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </>
  );
}
