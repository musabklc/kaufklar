"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { currentUser, supabaseUser } from "@/lib/supabase/server";
import type { FormState } from "../konto/actions";

const Title = z.string().trim().min(5, "Der Titel braucht mindestens 5 Zeichen.").max(120, "Der Titel ist zu lang (max. 120 Zeichen).");
const Body = z.string().trim().min(2, "Bitte schreib etwas.").max(5000, "Der Beitrag ist zu lang (max. 5.000 Zeichen).");
const str = (f: FormData, k: string) => (typeof f.get(k) === "string" ? (f.get(k) as string) : "");
const dbError = (m: string) => (/Zu viele Beiträge/.test(m) ? "Zu viele Beiträge in kurzer Zeit. Bitte warte ein paar Minuten." : "Speichern hat nicht geklappt. Bitte erneut versuchen.");

async function author() {
  const user = await currentUser();
  return user?.username ? user : null;
}

export async function createThread(_: FormState, f: FormData): Promise<FormState> {
  if (str(f, "website")) return {};
  const user = await author();
  if (!user) return { message: "Bitte melde dich an, um ein Thema zu erstellen." };
  const title = Title.safeParse(str(f, "title"));
  const body = Body.safeParse(str(f, "body"));
  if (!title.success) return { message: title.error.issues[0].message };
  if (!body.success) return { message: body.error.issues[0].message };
  const sb = await supabaseUser();
  const { data: thread, error } = await sb.from("forum_threads").insert({ board_id: str(f, "board"), author_id: user.id, title: title.data }).select("id").single();
  if (error || !thread) return { message: dbError(error?.message ?? "") };
  const { error: postError } = await sb.from("forum_posts").insert({ thread_id: thread.id, author_id: user.id, body: body.data });
  if (postError) return { message: dbError(postError.message) };
  redirect(`/forum/thema/${thread.id}`);
}

export async function reply(_: FormState, f: FormData): Promise<FormState> {
  if (str(f, "website")) return {};
  const user = await author();
  if (!user) return { message: "Bitte melde dich an, um zu antworten." };
  const body = Body.safeParse(str(f, "body"));
  const threadId = Number(str(f, "thread"));
  if (!body.success) return { message: body.error.issues[0].message };
  if (!Number.isInteger(threadId)) return { message: "Unbekanntes Thema." };
  const sb = await supabaseUser();
  const { error } = await sb.from("forum_posts").insert({ thread_id: threadId, author_id: user.id, body: body.data });
  if (error) return { message: dbError(error.message) };
  revalidatePath(`/forum/thema/${threadId}`);
  return { ok: true, message: "Antwort veröffentlicht." };
}

/** Eigenen Beitrag löschen; RLS erlaubt nur den eigenen. */
export async function deletePost(f: FormData) {
  const id = Number(str(f, "post"));
  const threadId = Number(str(f, "thread"));
  const sb = await supabaseUser();
  const { data: thread } = await sb.from("forum_threads").select("board_id").eq("id", threadId).maybeSingle();
  if (Number.isInteger(id)) await sb.from("forum_posts").delete().eq("id", id);
  // Letzter Beitrag weg → Thema wurde per Trigger mitgelöscht, zurück ins Unterforum statt 404
  const { data: still } = await sb.from("forum_threads").select("id").eq("id", threadId).maybeSingle();
  if (!still && thread) redirect(`/forum/${thread.board_id}`);
  revalidatePath(`/forum/thema/${threadId}`);
}

/** Meldung (Digital Services Act): ab 3 Meldungen wird der Beitrag automatisch ausgeblendet. */
export async function reportPost(_: FormState, f: FormData): Promise<FormState> {
  const user = await author();
  if (!user) return { message: "Bitte melde dich an, um einen Beitrag zu melden. Ohne Konto: E-Mail über das Impressum." };
  const reason = z.string().trim().min(3, "Bitte kurz begründen.").max(500).safeParse(str(f, "reason"));
  const id = Number(str(f, "post"));
  if (!reason.success) return { message: reason.error.issues[0].message };
  const sb = await supabaseUser();
  const { error } = await sb.from("forum_reports").insert({ post_id: id, reporter_id: user.id, reason: reason.data });
  if (error) return { message: error.code === "23505" ? "Du hast diesen Beitrag schon gemeldet." : "Melden hat nicht geklappt." };
  return { ok: true, message: "Danke, wir prüfen den Beitrag." };
}
