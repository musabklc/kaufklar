"use server";

import { createClient } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { sniff } from "@/lib/guards";
import { SITE_URL } from "@/lib/site";
import { currentUser, supabaseUser } from "@/lib/supabase/server";

export type FormState = { ok?: boolean; message?: string };

const USERNAME = /^[A-Za-z0-9_.-]{3,24}$/;
// Gleiche Regeln wie in Supabase eingestellt (mind. 10 Zeichen, Groß-, Kleinbuchstabe, Ziffer) – vorab, für klare Fehlermeldungen
const PASSWORD = z
  .string()
  .min(10, "Das Passwort braucht mindestens 10 Zeichen.")
  .max(128)
  .regex(/[a-z]/, "Das Passwort braucht einen Kleinbuchstaben.")
  .regex(/[A-Z]/, "Das Passwort braucht einen Großbuchstaben.")
  .regex(/\d/, "Das Passwort braucht eine Ziffer.");

const SignUp = z.object({
  username: z.string().trim().regex(USERNAME, "Benutzername: 3–24 Zeichen, nur Buchstaben, Ziffern, Punkt, Minus, Unterstrich."),
  email: z.string().trim().email("Bitte eine gültige E-Mail-Adresse eingeben.").max(254),
  password: PASSWORD,
  terms: z.literal("on", { message: "Bitte stimme den Forenregeln und der Datenschutzerklärung zu." }),
  age: z.literal("on", { message: "Das Forum ist ab 16 Jahren." }),
});

const field = (f: FormData, k: string) => (typeof f.get(k) === "string" ? (f.get(k) as string) : undefined);
const firstIssue = (e: z.ZodError) => e.issues[0]?.message ?? "Bitte die Eingaben prüfen.";

export async function signUp(_: FormState, f: FormData): Promise<FormState> {
  if (field(f, "website")) return { ok: true, message: "Fast geschafft! Bitte bestätige deine E-Mail-Adresse." }; // Spamfalle
  const parsed = SignUp.safeParse({ username: field(f, "username"), email: field(f, "email"), password: field(f, "password"), terms: field(f, "terms"), age: field(f, "age") });
  if (!parsed.success) return { message: firstIssue(parsed.error) };
  const sb = await supabaseUser();
  const { data: taken } = await sb.from("profiles").select("id").ilike("username", parsed.data.username).maybeSingle();
  if (taken) return { message: "Dieser Benutzername ist schon vergeben." };
  const { error } = await sb.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: { data: { username: parsed.data.username }, emailRedirectTo: `${SITE_URL}/auth/confirm?next=/forum` },
  });
  if (error) return { message: error.code === "weak_password" ? "Das Passwort ist zu schwach." : "Die Registrierung hat nicht geklappt. Bitte später erneut versuchen." };
  // Bewusst gleiche Antwort, ob die E-Mail schon existiert oder nicht (keine Konto-Ausforschung)
  return { ok: true, message: "Fast geschafft! Wir haben dir eine E-Mail geschickt. Klick auf den Link darin, um dein Konto zu bestätigen." };
}

export async function signIn(_: FormState, f: FormData): Promise<FormState> {
  const email = field(f, "email")?.trim() ?? "";
  const password = field(f, "password") ?? "";
  if (!email || !password) return { message: "Bitte E-Mail und Passwort eingeben." };
  const sb = await supabaseUser();
  const { error } = await sb.auth.signInWithPassword({ email, password });
  if (error) return { message: error.code === "email_not_confirmed" ? "Bitte bestätige zuerst deine E-Mail-Adresse (Link in der E-Mail)." : "E-Mail oder Passwort stimmen nicht." };
  redirect("/forum");
}

export async function signOut() {
  const sb = await supabaseUser();
  await sb.auth.signOut();
  redirect("/forum");
}

export async function requestReset(_: FormState, f: FormData): Promise<FormState> {
  const email = field(f, "email")?.trim() ?? "";
  if (!z.string().email().safeParse(email).success) return { message: "Bitte eine gültige E-Mail-Adresse eingeben." };
  const sb = await supabaseUser();
  await sb.auth.resetPasswordForEmail(email, { redirectTo: `${SITE_URL}/auth/confirm?next=/konto/neues-passwort` });
  return { ok: true, message: "Falls es ein Konto mit dieser Adresse gibt, haben wir dir einen Link zum Zurücksetzen geschickt." };
}

export async function setNewPassword(_: FormState, f: FormData): Promise<FormState> {
  const parsed = PASSWORD.safeParse(field(f, "password"));
  if (!parsed.success) return { message: firstIssue(parsed.error) };
  const sb = await supabaseUser();
  const { error } = await sb.auth.updateUser({ password: parsed.data });
  if (error) return { message: "Das hat nicht geklappt. Bitte fordere einen neuen Link an." };
  redirect("/konto");
}

const Car = z
  .string()
  .trim()
  .max(60, "Höchstens 60 Zeichen.")
  .regex(/^[\p{L}\p{N} .,\-/+()&'’]*$/u, "Bitte nur Buchstaben, Ziffern und einfache Satzzeichen (keine Links).");

/** Profil: welches Auto man fährt (freiwillig, öffentlich sichtbar). Leer = entfernen. */
export async function updateCar(_: FormState, f: FormData): Promise<FormState> {
  const user = await currentUser();
  if (!user?.username) return { message: "Bitte melde dich erneut an." };
  const parsed = Car.safeParse(field(f, "car") ?? "");
  if (!parsed.success) return { message: firstIssue(parsed.error) };
  const car = parsed.data.length >= 2 ? parsed.data : null;
  const sb = await supabaseUser();
  const { error } = await sb.from("profiles").update({ car }).eq("id", user.id);
  if (error) return { message: "Speichern hat nicht geklappt. Bitte erneut versuchen." };
  revalidatePath("/konto");
  return { ok: true, message: car ? "Gespeichert." : "Auto entfernt." };
}

const AVATAR_MAX = 300 * 1024;

/** Profilbild hochladen: der Browser liefert ein 256×256-Bild (WebP/JPEG); Server prüft Größe und echte Dateisignatur. */
export async function uploadAvatar(_: FormState, f: FormData): Promise<FormState> {
  const user = await currentUser();
  if (!user?.username) return { message: "Bitte melde dich erneut an." };
  const file = f.get("avatar");
  if (!(file instanceof File) || file.size === 0) return { message: "Bitte ein Bild auswählen." };
  if (file.size > AVATAR_MAX) return { message: "Das Bild ist zu groß." };
  const bytes = new Uint8Array(await file.arrayBuffer());
  const type = sniff(bytes);
  if (type !== "image/webp" && type !== "image/jpeg") return { message: "Bitte ein JPG-, PNG- oder WebP-Bild wählen." };
  const path = `${user.id}/avatar-${Date.now()}.${type === "image/webp" ? "webp" : "jpg"}`; // neuer Name: kein veralteter Browser-Cache
  const sb = await supabaseUser();
  const { error } = await sb.storage.from("avatars").upload(path, bytes, { contentType: type, cacheControl: "31536000" });
  if (error) return { message: "Hochladen hat nicht geklappt. Bitte erneut versuchen." };
  const { error: dbError } = await sb.from("profiles").update({ avatar_path: path }).eq("id", user.id);
  if (dbError) {
    await sb.storage.from("avatars").remove([path]);
    return { message: "Speichern hat nicht geklappt. Bitte erneut versuchen." };
  }
  if (user.avatarPath) await sb.storage.from("avatars").remove([user.avatarPath]);
  revalidatePath("/konto");
  return { ok: true, message: "Profilbild gespeichert." };
}

export async function removeAvatar(): Promise<void> {
  const user = await currentUser();
  if (!user?.avatarPath) return;
  const sb = await supabaseUser();
  await sb.from("profiles").update({ avatar_path: null }).eq("id", user.id);
  await sb.storage.from("avatars").remove([user.avatarPath]);
  revalidatePath("/konto");
}

/** DSGVO Art. 17: Konto mit allen eigenen Beiträgen löschen. Vorher Passwort bestätigen. */
export async function deleteAccount(_: FormState, f: FormData): Promise<FormState> {
  const user = await currentUser();
  if (!user?.email) return { message: "Bitte melde dich erneut an." };
  const sb = await supabaseUser();
  const { error } = await sb.auth.signInWithPassword({ email: user.email, password: field(f, "password") ?? "" });
  if (error) return { message: "Das Passwort stimmt nicht." };
  await sb.from("forum_posts").delete().eq("author_id", user.id);
  // Profilbilder liegen im Speicher, nicht in der Tabelle – sie verschwinden nicht mit dem Konto
  const { data: files } = await sb.storage.from("avatars").list(user.id);
  if (files?.length) await sb.storage.from("avatars").remove(files.map((x) => `${user.id}/${x.name}`));
  const admin = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SECRET_KEY!, { auth: { persistSession: false } });
  await sb.auth.signOut({ scope: "global" }); // alle Sitzungen beenden, bevor das Konto verschwindet
  const { error: delError } = await admin.auth.admin.deleteUser(user.id);
  if (delError) return { message: "Löschen fehlgeschlagen. Bitte schreib uns über das Impressum." };
  redirect("/forum?geloescht=1");
}
