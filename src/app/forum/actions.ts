"use server";

import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { classifyPost } from "@/lib/server/forum-insights";
import { isBanned, notifyReply, profileFlags, serviceDb } from "@/lib/server/forum-admin";
import { redirect } from "next/navigation";
import { z } from "zod";
import { sniff } from "@/lib/guards";
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

/** Wer schreiben will: angemeldet, mit Profil, nicht gesperrt. */
async function writer(): Promise<{ user: NonNullable<Awaited<ReturnType<typeof author>>> } | { message: string }> {
  const user = await author();
  if (!user) return { message: "Bitte melde dich an, um zu schreiben." };
  const flags = await profileFlags(user.id);
  if (isBanned(flags)) return { message: `Dein Konto ist bis ${new Date(flags.bannedUntil!).toLocaleDateString("de-DE", { timeZone: "Europe/Berlin" })} für das Schreiben gesperrt.` };
  return { user };
}

// ---------- Fotos in Beiträgen ----------
const PHOTO_MAX = 1_500_000;
type Photo = { bytes: Uint8Array; type: "image/jpeg" | "image/webp" };

/** Fotos prüfen, bevor etwas gespeichert wird: max. 3, je 1,5 MB, echte JPEG/WebP-Signatur. */
async function readPhotos(f: FormData): Promise<Photo[] | string> {
  const files = f.getAll("photos").filter((x): x is File => x instanceof File && x.size > 0);
  if (files.length > 3) return "Höchstens 3 Fotos.";
  const out: Photo[] = [];
  for (const file of files) {
    if (file.size > PHOTO_MAX) return "Ein Foto ist zu groß.";
    const bytes = new Uint8Array(await file.arrayBuffer());
    const type = sniff(bytes);
    if (type !== "image/jpeg" && type !== "image/webp") return "Bitte nur Fotos (JPG, PNG oder WebP).";
    out.push({ bytes, type });
  }
  return out;
}

/** Fotos in den eigenen Ordner laden und am Beitrag vermerken. Fehler: Beitrag bleibt, nur ohne Fotos. */
async function attachPhotos(sb: Awaited<ReturnType<typeof supabaseUser>>, userId: string, postId: number, photos: Photo[]) {
  if (!photos.length) return true;
  const paths: string[] = [];
  for (const [i, p] of photos.entries()) {
    const path = `${userId}/${postId}-${i}.${p.type === "image/webp" ? "webp" : "jpg"}`;
    const { error } = await sb.storage.from("forum").upload(path, p.bytes, { contentType: p.type, cacheControl: "31536000", upsert: false });
    if (!error) paths.push(path);
  }
  if (!paths.length) return false;
  const { error } = await sb.from("forum_posts").update({ image_paths: paths }).eq("id", postId);
  return !error;
}

export async function createThread(_: FormState, f: FormData): Promise<FormState> {
  if (str(f, "website")) return {};
  const w = await writer();
  if ("message" in w) return { message: w.message };
  const { user } = w;
  const title = Title.safeParse(str(f, "title"));
  const body = Body.safeParse(str(f, "body"));
  if (!title.success) return { message: title.error.issues[0].message };
  if (!body.success) return { message: body.error.issues[0].message };
  const photos = await readPhotos(f);
  if (typeof photos === "string") return { message: photos };
  const sb = await supabaseUser();
  const { data: thread, error } = await sb.from("forum_threads").insert({ board_id: str(f, "board"), author_id: user.id, title: title.data }).select("id").single();
  if (error || !thread) return { message: dbError(error?.message ?? "") };
  const { data: post, error: postError } = await sb.from("forum_posts").insert({ thread_id: thread.id, author_id: user.id, body: body.data }).select("id").single();
  if (postError || !post) return { message: dbError(postError?.message ?? "") };
  await attachPhotos(sb, user.id, post.id, photos);
  after(() => classifyPost(post.id)); // KI liest den Beitrag nach der Antwort, der Nutzer wartet nicht
  redirect(`/forum/thema/${thread.id}`);
}

export async function reply(_: FormState, f: FormData): Promise<FormState> {
  if (str(f, "website")) return {};
  const w = await writer();
  if ("message" in w) return { message: w.message };
  const { user } = w;
  const body = Body.safeParse(str(f, "body"));
  const threadId = Number(str(f, "thread"));
  if (!body.success) return { message: body.error.issues[0].message };
  if (!Number.isInteger(threadId)) return { message: "Unbekanntes Thema." };
  const photos = await readPhotos(f);
  if (typeof photos === "string") return { message: photos };
  const sb = await supabaseUser();
  const { data: post, error } = await sb.from("forum_posts").insert({ thread_id: threadId, author_id: user.id, body: body.data }).select("id").single();
  if (error || !post) return { message: dbError(error?.message ?? "") };
  const photosOk = await attachPhotos(sb, user.id, post.id, photos);
  after(async () => {
    await classifyPost(post.id);
    await notifyReply(threadId, user.id);
  });
  revalidatePath(`/forum/thema/${threadId}`);
  return { ok: true, message: photosOk ? "Antwort veröffentlicht." : "Antwort veröffentlicht, die Fotos konnten aber nicht gespeichert werden." };
}

/** Eigenen Beitrag bearbeiten (RLS: nur der eigene). Die KI liest ihn danach neu. */
export async function editPost(_: FormState, f: FormData): Promise<FormState> {
  const w = await writer();
  if ("message" in w) return { message: w.message };
  const body = Body.safeParse(str(f, "body"));
  const id = Number(str(f, "post"));
  const threadId = Number(str(f, "thread"));
  if (!body.success) return { message: body.error.issues[0].message };
  if (!Number.isInteger(id)) return { message: "Unbekannter Beitrag." };
  const sb = await supabaseUser();
  const { data, error } = await sb.from("forum_posts").update({ body: body.data, edited_at: new Date().toISOString() }).eq("id", id).eq("author_id", w.user.id).select("id");
  if (error || !data?.length) return { message: "Speichern hat nicht geklappt." };
  after(() => classifyPost(id));
  revalidatePath(`/forum/thema/${threadId}`);
  return { ok: true, message: "Gespeichert." };
}

/** Fremden Beitrag als hilfreich markieren oder die Markierung zurücknehmen. */
export async function toggleHelpful(f: FormData) {
  const w = await writer();
  if ("message" in w) return;
  const id = Number(str(f, "post"));
  const threadId = Number(str(f, "thread"));
  if (!Number.isInteger(id)) return;
  const sb = await supabaseUser();
  const { data } = await sb.from("forum_helpful").delete().eq("post_id", id).eq("user_id", w.user.id).select("post_id");
  if (!data?.length) await sb.from("forum_helpful").insert({ post_id: id });
  revalidatePath(`/forum/thema/${threadId}`);
}

/** Eigenen Beitrag löschen; RLS erlaubt nur den eigenen. */
export async function deletePost(f: FormData) {
  const id = Number(str(f, "post"));
  const threadId = Number(str(f, "thread"));
  const sb = await supabaseUser();
  const { data: thread } = await sb.from("forum_threads").select("board_id").eq("id", threadId).maybeSingle();
  if (Number.isInteger(id)) {
    const { data: gone } = await sb.from("forum_posts").delete().eq("id", id).select("image_paths");
    const paths = gone?.[0]?.image_paths as string[] | undefined;
    if (paths?.length) await sb.storage.from("forum").remove(paths);
  }
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

// ---------- Moderation (nur Admin; Schreibzugriffe mit dem Server-Schlüssel, nach Admin-Prüfung) ----------

async function admin() {
  const user = await currentUser();
  if (!user) return null;
  return (await profileFlags(user.id)).isAdmin ? serviceDb() : null;
}
const num = (f: FormData, k: string) => Number(str(f, k));

/** Beitrag ist in Ordnung: wieder einblenden, Meldungen erledigt. */
export async function modApprove(f: FormData) {
  const db = await admin();
  const id = num(f, "post");
  if (!db || !Number.isInteger(id)) return;
  await db.from("forum_posts").update({ hidden: false }).eq("id", id);
  await db.from("forum_reports").delete().eq("post_id", id);
  revalidatePath("/forum/moderation");
}

/** Beitrag verstößt gegen die Regeln: löschen (Zähler und leere Themen erledigt der Trigger). */
export async function modDelete(f: FormData) {
  const db = await admin();
  const id = num(f, "post");
  if (!db || !Number.isInteger(id)) return;
  const { data: gone } = await db.from("forum_posts").delete().eq("id", id).select("image_paths");
  const paths = gone?.[0]?.image_paths as string[] | undefined;
  if (paths?.length) await db.storage.from("forum").remove(paths);
  revalidatePath("/forum/moderation");
}

/** Konto sperren (Tage; 0 = Sperre aufheben). Lesen geht weiter, Schreiben nicht. */
export async function modBan(f: FormData) {
  const db = await admin();
  const user = str(f, "user");
  const days = num(f, "days");
  if (!db || !z.string().uuid().safeParse(user).success || !Number.isInteger(days) || days < 0 || days > 3650) return;
  await db.from("profiles").update({ banned_until: days ? new Date(Date.now() + days * 864e5).toISOString() : null }).eq("id", user).eq("is_admin", false);
  revalidatePath("/forum/moderation");
}
