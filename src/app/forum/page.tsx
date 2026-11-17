import { Suspense } from "react";
import { connection } from "next/server";
import Link from "next/link";
import { currentUser, forumEnabled, supabaseUser } from "@/lib/supabase/server";
import { SearchForm } from "@/components/forum/search-form";
import { profileFlags, serviceDb } from "@/lib/server/forum-admin";

export const metadata = { title: "Forum – Tachoklar", description: "Austausch unter Gebrauchtwagen-Käufern und -Fahrern: Kaufberatung, Inserat-Check, Erfahrungen, Unterforen je Marke." };

export default function ForumPage() {
  return (
    <div className="mx-auto max-w-[78rem] px-4 py-10 sm:px-6 lg:py-16">
      <Suspense fallback={<div className="h-96 animate-pulse rounded-3xl bg-card" />}>
        <Boards />
      </Suspense>
    </div>
  );
}

async function Boards() {
  await connection(); // Sitzung und Beiträge: immer zur Anfragezeit, nie vorab gerendert
  if (!forumEnabled()) return <p>Das Forum ist auf diesem Server noch nicht eingerichtet.</p>;
  const sb = await supabaseUser();
  const [user, { data: boards }, { data: threads }] = await Promise.all([
    currentUser(),
    sb.from("forum_boards").select("id, title, description, grp").order("sort"),
    sb.from("forum_threads").select("board_id, post_count, last_post_at").limit(5000),
  ]);
  const admin = user ? (await profileFlags(user.id)).isAdmin : false;
  const openReports = admin ? ((await serviceDb()?.from("forum_reports").select("id", { count: "exact", head: true }))?.count ?? 0) : 0;
  const stats = new Map<string, { threads: number; posts: number; last: string | null }>();
  for (const t of threads ?? []) {
    const s = stats.get(t.board_id) ?? { threads: 0, posts: 0, last: null };
    s.threads++;
    s.posts += t.post_count;
    if (!s.last || t.last_post_at > s.last) s.last = t.last_post_at;
    stats.set(t.board_id, s);
  }
  const groups = [...new Set((boards ?? []).map((b) => b.grp))];
  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-6">
        <div>
          <h1 className="text-4xl font-semibold tracking-[-0.03em] sm:text-6xl">Forum</h1>
          <p className="mt-4 max-w-2xl text-lg">Frag Leute, die das Auto fahren, das du suchst. Teile, was bei deinem kaputtgegangen ist und was es gekostet hat.</p>
        </div>
        {user ? (
          <div className="flex flex-wrap items-center gap-4 text-sm font-medium">
            {admin && <Link href="/admin" className="rounded-full bg-card px-4 py-2 hover:underline">Dashboard</Link>}
            {admin && (
              <Link href="/forum/moderation" className="rounded-full bg-warn-soft px-4 py-2 hover:underline">
                Moderation{openReports ? ` (${openReports})` : ""}
              </Link>
            )}
            <Link href="/konto" className="text-muted-foreground hover:text-foreground">Angemeldet als {user.username}</Link>
          </div>
        ) : (
          <Link href="/konto" className="inline-flex h-11 items-center rounded-full bg-primary px-6 font-medium text-primary-foreground">Anmelden oder Konto erstellen</Link>
        )}
      </div>
      <SearchForm className="mt-8" />
      {groups.map((g) => (
        <section key={g} className="mt-12">
          <h2 className="text-2xl font-semibold">{g}</h2>
          <ul className={`mt-5 grid gap-3 ${g === "Marken" ? "sm:grid-cols-2 lg:grid-cols-3" : "sm:grid-cols-2"}`}>
            {(boards ?? []).filter((b) => b.grp === g).map((b) => {
              const s = stats.get(b.id);
              return (
                <li key={b.id}>
                  <Link href={`/forum/${b.id}`} className="flex h-full flex-col rounded-3xl bg-card p-5 transition-transform hover:-translate-y-0.5 sm:p-6">
                    <span className="text-xl font-semibold">{b.title}</span>
                    {b.description && <span className="mt-1 text-foreground/80">{b.description}</span>}
                    <span className="mt-auto pt-4 text-sm text-muted-foreground">
                      {s ? `${s.threads} ${s.threads === 1 ? "Thema" : "Themen"} · ${s.posts} Beiträge · zuletzt ${new Date(s.last!).toLocaleDateString("de-DE", { timeZone: "Europe/Berlin" })}` : "Noch keine Themen – starte das erste"}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      ))}
      <p className="mt-12 text-sm text-muted-foreground">
        Es gelten die <Link href="/forum/regeln" className="text-brand underline">Forenregeln</Link>. Beiträge sind öffentlich lesbar.
      </p>
    </>
  );
}
