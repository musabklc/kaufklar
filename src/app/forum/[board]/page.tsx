import { Suspense } from "react";
import { connection } from "next/server";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ActionForm, labelCls } from "@/components/forum/action-form";
import { currentUser, forumEnabled, supabaseUser } from "@/lib/supabase/server";
import { createThread } from "../actions";

export default function BoardPage({ params }: { params: Promise<{ board: string }> }) {
  return (
    <div className="mx-auto max-w-[78rem] px-4 py-10 sm:px-6 lg:py-16">
      <Suspense fallback={<div className="h-96 animate-pulse rounded-3xl bg-card" />}>
        <Board params={params} />
      </Suspense>
    </div>
  );
}

const when = (d: string) => new Date(d).toLocaleString("de-DE", { dateStyle: "medium", timeStyle: "short", timeZone: "Europe/Berlin" });

async function Board({ params }: { params: Promise<{ board: string }> }) {
  await connection(); // Sitzung und Beiträge: immer zur Anfragezeit, nie vorab gerendert
  if (!forumEnabled()) notFound();
  const { board: id } = await params;
  const sb = await supabaseUser();
  const [{ data: board }, { data: threads }, user] = await Promise.all([
    sb.from("forum_boards").select("id, title, description").eq("id", id).maybeSingle(),
    sb.from("forum_threads").select("id, title, post_count, last_post_at, author:profiles(username)").eq("board_id", id).order("last_post_at", { ascending: false }).limit(100),
    currentUser(),
  ]);
  if (!board) notFound();
  return (
    <>
      <Link href="/forum" className="text-sm font-medium text-brand">← Alle Foren</Link>
      <h1 className="mt-3 text-4xl font-semibold tracking-[-0.03em] sm:text-5xl">{board.title}</h1>
      {board.description && <p className="mt-3 max-w-2xl text-lg">{board.description}</p>}

      <section className="mt-10">
        <h2 className="sr-only">Themen</h2>
        {threads?.length ? (
          <ul className="space-y-3">
            {threads.map((t) => (
              <li key={t.id}>
                <Link href={`/forum/thema/${t.id}`} className="flex flex-col gap-1 rounded-2xl bg-card px-5 py-4 transition-transform hover:-translate-y-0.5 sm:flex-row sm:items-center sm:justify-between">
                  <span className="font-semibold">{t.title}</span>
                  <span className="shrink-0 text-sm text-muted-foreground">
                    {(t.author as unknown as { username: string } | null)?.username ?? "gelöschtes Konto"} · {t.post_count} {t.post_count === 1 ? "Beitrag" : "Beiträge"} · {when(t.last_post_at)}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <p className="rounded-2xl bg-card p-6">Hier gibt es noch keine Themen. Starte das erste!</p>
        )}
      </section>

      <section className="mt-12 rounded-3xl bg-card p-6 sm:p-8">
        <h2 className="text-2xl font-semibold">Neues Thema</h2>
        {user?.username ? (
          <ActionForm action={createThread} submit="Thema veröffentlichen" className="mt-6 space-y-4">
            <input type="hidden" name="board" value={board.id} />
            <label className={labelCls}>Titel<Input name="title" required minLength={5} maxLength={120} placeholder="z. B. BMW 320d F31 mit 180.000 km – worauf achten?" className="h-11" /></label>
            <label className={labelCls}>
              Text
              <Textarea name="body" required minLength={2} maxLength={5000} rows={6} className="text-base" />
              <span className="font-normal text-muted-foreground">Keine Telefonnummern, Kennzeichen oder Namen anderer. Bitte die <Link href="/forum/regeln" className="text-brand underline">Forenregeln</Link> beachten.</span>
            </label>
          </ActionForm>
        ) : (
          <p className="mt-3">
            <Link href="/konto" className="font-medium text-brand underline">Melde dich an</Link>, um ein Thema zu erstellen.
          </p>
        )}
      </section>
    </>
  );
}
