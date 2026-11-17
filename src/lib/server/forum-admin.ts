import "server-only";
import { createClient } from "@supabase/supabase-js";
import { sendMail } from "./mail";

/** Nur Server: Profil-Felder, die nicht öffentlich sind (Admin, Sperre, Mail-Einstellung). */
export const serviceDb = () =>
  process.env.SUPABASE_URL && process.env.SUPABASE_SECRET_KEY
    ? createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SECRET_KEY, { auth: { persistSession: false } })
    : null;

export type ProfileFlags = { isAdmin: boolean; notifyReplies: boolean; bannedUntil: string | null };

export async function profileFlags(id: string): Promise<ProfileFlags> {
  const { data } = (await serviceDb()?.from("profiles").select("is_admin, notify_replies, banned_until").eq("id", id).maybeSingle()) ?? { data: null };
  return { isAdmin: Boolean(data?.is_admin), notifyReplies: data?.notify_replies ?? true, bannedUntil: data?.banned_until ?? null };
}

export const isBanned = (f: ProfileFlags) => Boolean(f.bannedUntil && new Date(f.bannedUntil) > new Date());

/** Mail an den Themen-Ersteller bei neuer Antwort – höchstens eine pro Thema und Stunde, nicht bei eigenen Antworten. */
export async function notifyReply(threadId: number, replierId: string) {
  const db = serviceDb();
  if (!db) return;
  const { data: t } = await db.from("forum_threads").select("id, title, author_id, notified_at").eq("id", threadId).maybeSingle();
  if (!t?.author_id || t.author_id === replierId) return;
  if (t.notified_at && Date.now() - new Date(t.notified_at).getTime() < 3600_000) return;
  const flags = await profileFlags(t.author_id);
  if (!flags.notifyReplies) return;
  const { data: u } = await db.auth.admin.getUserById(t.author_id);
  if (!u?.user?.email) return;
  await db.from("forum_threads").update({ notified_at: new Date().toISOString() }).eq("id", t.id);
  await sendMail(
    u.user.email,
    `Neue Antwort: ${t.title}`,
    `In deinem Thema „${t.title}“ im Tachoklar-Forum gibt es eine neue Antwort.`,
    { label: "Antwort lesen", href: `/forum/thema/${t.id}` },
    "Du bekommst diese E-Mail, weil du das Thema erstellt hast (höchstens eine pro Stunde). Abschalten unter „Konto“ → „Benachrichtigungen“.",
  );
}
