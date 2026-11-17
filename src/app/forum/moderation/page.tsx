import { Suspense } from "react";
import { connection } from "next/server";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Button } from "@/components/ui/button";
import { currentUser } from "@/lib/supabase/server";
import { profileFlags, serviceDb } from "@/lib/server/forum-admin";
import { modApprove, modBan, modDelete } from "../actions";

export const metadata = { title: "Moderation – Tachoklar", robots: { index: false } };

export default function ModerationPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6 lg:py-16">
      <Suspense fallback={<div className="h-64 animate-pulse rounded-3xl bg-card" />}>
        <Queue />
      </Suspense>
    </div>
  );
}

type Item = { id: number; body: string; hidden: boolean; created_at: string; author_id: string | null; author: { username: string } | null; thread: { id: number; title: string } | null };
const when = (d: string) => new Date(d).toLocaleString("de-DE", { dateStyle: "medium", timeStyle: "short", timeZone: "Europe/Berlin" });

async function Queue() {
  await connection();
  const user = await currentUser();
  // Für alle anderen gibt es diese Seite nicht
  if (!user || !(await profileFlags(user.id)).isAdmin) notFound();
  const db = serviceDb()!;
  const [{ data: reports }, { data: hidden }] = await Promise.all([
    db.from("forum_reports").select("post_id, reason, created_at").order("created_at", { ascending: false }).limit(300),
    db.from("forum_posts").select("id").eq("hidden", true).limit(300),
  ]);
  const ids = [...new Set([...(reports ?? []).map((r) => r.post_id), ...(hidden ?? []).map((p) => p.id)])];
  const { data: posts } = ids.length
    ? await db.from("forum_posts").select("id, body, hidden, created_at, author_id, author:profiles(username), thread:forum_threads(id, title)").in("id", ids)
    : { data: [] };
  const banned = new Map<string, string | null>();
  const authors = [...new Set((posts ?? []).map((p) => p.author_id).filter(Boolean))] as string[];
  if (authors.length) {
    const { data } = await db.from("profiles").select("id, banned_until").in("id", authors);
    for (const p of data ?? []) banned.set(p.id, p.banned_until);
  }
  const list = ((posts ?? []) as unknown as Item[]).sort((a, b) => Number(b.hidden) - Number(a.hidden) || b.id - a.id);

  return (
    <>
      <Link href="/forum" className="text-sm font-medium text-brand">← Forum</Link>
      <h1 className="mt-3 text-4xl font-semibold tracking-[-0.03em]">Moderation</h1>
      <p className="mt-3 text-lg">Gemeldete und ausgeblendete Beiträge. Ab 3 Meldungen blendet das System einen Beitrag automatisch aus, bis du entscheidest.</p>
      {!list.length && <p className="mt-8 rounded-3xl bg-card p-6">Nichts zu tun. Keine offenen Meldungen.</p>}
      <ul className="mt-8 space-y-4">
        {list.map((p) => {
          const reasons = (reports ?? []).filter((r) => r.post_id === p.id);
          const ban = p.author_id ? banned.get(p.author_id) : null;
          return (
            <li key={p.id} className="rounded-3xl bg-card p-5 sm:p-6">
              <p className="text-sm text-muted-foreground">
                <span className="font-semibold text-foreground">{p.author?.username ?? "gelöschtes Konto"}</span> · {when(p.created_at)} ·{" "}
                {p.thread && <Link href={`/forum/thema/${p.thread.id}#b${p.id}`} className="text-brand underline">{p.thread.title}</Link>}
                {p.hidden && <span className="ml-2 rounded-full bg-bad-soft px-2 py-0.5 text-xs font-medium text-bad">ausgeblendet</span>}
                {ban && new Date(ban) > new Date() && <span className="ml-2 rounded-full bg-warn-soft px-2 py-0.5 text-xs font-medium">gesperrt bis {new Date(ban).toLocaleDateString("de-DE")}</span>}
              </p>
              <p className="mt-3 whitespace-pre-wrap break-words">{p.body}</p>
              {reasons.length > 0 && (
                <div className="mt-4 rounded-2xl bg-muted/60 p-3 text-sm">
                  <p className="font-medium">{reasons.length} {reasons.length === 1 ? "Meldung" : "Meldungen"}</p>
                  <ul className="mt-1 list-disc pl-5">{reasons.map((r, i) => <li key={i}>{r.reason}</li>)}</ul>
                </div>
              )}
              <div className="mt-4 flex flex-wrap gap-2">
                <form action={modApprove}><input type="hidden" name="post" value={p.id} /><Button type="submit" variant="outline" className="h-11 px-5">In Ordnung</Button></form>
                <form action={modDelete}><input type="hidden" name="post" value={p.id} /><Button type="submit" variant="destructive" className="h-11 px-5">Löschen</Button></form>
                {p.author_id && (
                  <>
                    <form action={modBan}><input type="hidden" name="user" value={p.author_id} /><input type="hidden" name="days" value="7" /><Button type="submit" variant="outline" className="h-11 px-5">7 Tage sperren</Button></form>
                    <form action={modBan}><input type="hidden" name="user" value={p.author_id} /><input type="hidden" name="days" value="3650" /><Button type="submit" variant="outline" className="h-11 px-5">Dauerhaft sperren</Button></form>
                    {ban && <form action={modBan}><input type="hidden" name="user" value={p.author_id} /><input type="hidden" name="days" value="0" /><Button type="submit" variant="ghost" className="h-11 px-5">Sperre aufheben</Button></form>}
                  </>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </>
  );
}
