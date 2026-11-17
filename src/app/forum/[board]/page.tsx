import { Suspense } from "react";
import { connection } from "next/server";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ActionForm, labelCls } from "@/components/forum/action-form";
import { SearchForm } from "@/components/forum/search-form";
import { PhotoInput } from "@/components/forum/photo-input";
import { currentUser, forumEnabled, supabasePublic, supabaseUser } from "@/lib/supabase/server";
import { createThread } from "../actions";

type SP = Promise<Record<string, string | string[] | undefined>>;

export async function generateMetadata({ params }: { params: Promise<{ board: string }> }) {
  await connection(); // Titel zur Anfragezeit, ohne Sitzung
  if (!forumEnabled()) return {};
  const { board } = await params;
  const { data } = await supabasePublic().from("forum_boards").select("title, description").eq("id", board).maybeSingle();
  return data ? { title: `${data.title} – Forum – Tachoklar`, description: data.description || `Erfahrungen und Fragen rund um ${data.title} im Tachoklar-Forum.`, alternates: { canonical: `/forum/${board}` } } : {};
}
const one = (x: string | string[] | undefined, max: number) => (typeof x === "string" ? x.slice(0, max) : "");

export default function BoardPage({ params, searchParams }: { params: Promise<{ board: string }>; searchParams: SP }) {
  return (
    <div className="mx-auto max-w-[78rem] px-4 py-10 sm:px-6 lg:py-16">
      <Suspense fallback={<div className="h-96 animate-pulse rounded-3xl bg-card" />}>
        <Board params={params} searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

const when = (d: string) => new Date(d).toLocaleString("de-DE", { dateStyle: "medium", timeStyle: "short", timeZone: "Europe/Berlin" });

async function Board({ params, searchParams }: { params: Promise<{ board: string }>; searchParams: SP }) {
  await connection(); // Sitzung und Beiträge: immer zur Anfragezeit, nie vorab gerendert
  if (!forumEnabled()) notFound();
  const { board: id } = await params;
  const sp = await searchParams;
  // Vorschlag aus einer Analyse ("Community fragen"): nur als Startwert, der Nutzer kann alles ändern
  const draft = { title: one(sp.titel, 120), body: one(sp.text, 5000) };
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
      <SearchForm className="mt-6" />

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

      <section id="neu" className="mt-12 scroll-mt-24 rounded-3xl bg-card p-6 sm:p-8">
        <h2 className="text-2xl font-semibold">Neues Thema</h2>
        {user?.username ? (
          <ActionForm action={createThread} submit="Thema veröffentlichen" className="mt-6 space-y-4">
            <input type="hidden" name="board" value={board.id} />
            <label className={labelCls}>Titel<Input name="title" required minLength={5} maxLength={120} defaultValue={draft.title} placeholder="z. B. BMW 320d F31 mit 180.000 km – worauf achten?" className="h-11" /></label>
            <label className={labelCls}>
              Text
              <Textarea name="body" required minLength={2} maxLength={5000} rows={draft.body ? 10 : 6} defaultValue={draft.body} className="text-base" />
              <span className="font-normal text-muted-foreground">Keine Telefonnummern, Kennzeichen oder Namen anderer. Bitte die <Link href="/forum/regeln" className="text-brand underline">Forenregeln</Link> beachten.</span>
            </label>
            <PhotoInput />
          </ActionForm>
        ) : (
          <p className="mt-3">
            <Link href={`/konto?weiter=${encodeURIComponent(`/forum/${board.id}${draft.title ? `?${new URLSearchParams({ titel: draft.title, text: draft.body })}` : ""}#neu`)}`} className="font-medium text-brand underline">Melde dich an</Link>, um ein Thema zu erstellen.
          </p>
        )}
      </section>
    </>
  );
}
