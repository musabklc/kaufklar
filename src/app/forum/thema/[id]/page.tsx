import { Suspense } from "react";
import { connection } from "next/server";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { ActionForm, labelCls } from "@/components/forum/action-form";
import { Avatar } from "@/components/forum/avatar";
import { currentUser, forumEnabled, supabaseUser } from "@/lib/supabase/server";
import { deletePost, reply, reportPost } from "../../actions";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const id = Number((await params).id);
  if (!forumEnabled() || !Number.isInteger(id)) return {};
  const sb = await supabaseUser();
  const { data } = await sb.from("forum_threads").select("title").eq("id", id).maybeSingle();
  return data ? { title: `${data.title} – Forum – Tachoklar` } : {};
}

export default function ThreadPage({ params }: { params: Promise<{ id: string }> }) {
  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6 lg:py-16">
      <Suspense fallback={<div className="h-96 animate-pulse rounded-3xl bg-card" />}>
        <Thread params={params} />
      </Suspense>
    </div>
  );
}

const when = (d: string) => new Date(d).toLocaleString("de-DE", { dateStyle: "medium", timeStyle: "short", timeZone: "Europe/Berlin" });
type Author = { username: string; car: string | null; avatar_path: string | null } | null;

async function Thread({ params }: { params: Promise<{ id: string }> }) {
  await connection(); // Sitzung und Beiträge: immer zur Anfragezeit, nie vorab gerendert
  if (!forumEnabled()) notFound();
  const id = Number((await params).id);
  if (!Number.isInteger(id)) notFound();
  const sb = await supabaseUser();
  const [{ data: thread }, { data: posts }, user] = await Promise.all([
    sb.from("forum_threads").select("id, title, board:forum_boards(id, title)").eq("id", id).maybeSingle(),
    sb.from("forum_posts").select("id, body, created_at, hidden, author_id, author:profiles(username, car, avatar_path)").eq("thread_id", id).order("created_at").limit(500),
    currentUser(),
  ]);
  if (!thread) notFound();
  const board = thread.board as unknown as { id: string; title: string } | null;
  return (
    <>
      {board && <Link href={`/forum/${board.id}`} className="text-sm font-medium text-brand">← {board.title}</Link>}
      <h1 className="mt-3 text-3xl font-semibold tracking-[-0.03em] text-balance sm:text-4xl">{thread.title}</h1>

      <ol className="mt-8 space-y-4">
        {(posts ?? []).map((p) => {
          const a = p.author as unknown as Author;
          return (
          <li key={p.id} id={`b${p.id}`} className="rounded-3xl bg-card p-5 sm:p-6">
            <div className="flex items-center gap-3">
              <Avatar name={a?.username} path={a?.avatar_path} />
              <div className="min-w-0 text-sm text-muted-foreground">
                <p>
                  <span className="font-semibold text-foreground">{a?.username ?? "gelöschtes Konto"}</span> · {when(p.created_at)}
                  {p.hidden && " · ausgeblendet (wird geprüft)"}
                </p>
                {a?.car && <p className="truncate">fährt {a.car}</p>}
              </div>
            </div>
            <p className="mt-3 whitespace-pre-wrap break-words leading-relaxed">{p.body}</p>
            <div className="mt-4 flex flex-wrap items-start gap-4 text-sm">
              {user?.id === p.author_id ? (
                <form action={deletePost}>
                  <input type="hidden" name="post" value={p.id} />
                  <input type="hidden" name="thread" value={id} />
                  <button className="text-muted-foreground underline-offset-4 hover:text-bad hover:underline">Löschen</button>
                </form>
              ) : (
                <details>
                  <summary className="cursor-pointer text-muted-foreground hover:text-foreground">Melden</summary>
                  <ActionForm action={reportPost} submit="Meldung senden" hideOnSuccess variant="outline" className="mt-3 space-y-3">
                    <input type="hidden" name="post" value={p.id} />
                    <label className={labelCls}>Warum? (z. B. Beleidigung, Werbung, persönliche Daten, rechtswidrig)<Input name="reason" required minLength={3} maxLength={500} className="h-11" /></label>
                  </ActionForm>
                </details>
              )}
            </div>
          </li>
          );
        })}
      </ol>

      <section className="mt-10 rounded-3xl bg-card p-6 sm:p-8">
        <h2 className="text-2xl font-semibold">Antworten</h2>
        {user?.username ? (
          <ActionForm action={reply} submit="Antwort veröffentlichen" className="mt-6 space-y-4">
            <input type="hidden" name="thread" value={id} />
            <label className={labelCls}>
              Deine Antwort
              <Textarea name="body" required minLength={2} maxLength={5000} rows={5} className="text-base" />
            </label>
          </ActionForm>
        ) : (
          <p className="mt-3">
            <Link href={`/konto?weiter=${encodeURIComponent(`/forum/thema/${id}`)}`} className="font-medium text-brand underline">Melde dich an</Link>, um zu antworten.
          </p>
        )}
      </section>
    </>
  );
}
