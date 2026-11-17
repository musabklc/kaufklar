import { Suspense } from "react";
import { connection } from "next/server";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ActionForm, labelCls } from "@/components/forum/action-form";
import { currentUser, forumEnabled } from "@/lib/supabase/server";
import { Avatar } from "@/components/forum/avatar";
import { AvatarUpload } from "@/components/forum/avatar-upload";
import { deleteAccount, removeAvatar, requestReset, setNotifyReplies, signIn, signOut, signUp, updateCar, uploadAvatar } from "./actions";
import { profileFlags } from "@/lib/server/forum-admin";

export const metadata = { title: "Konto – Tachoklar", robots: { index: false } };

type SP = Promise<Record<string, string | string[] | undefined>>;

export default function KontoPage({ searchParams }: { searchParams: SP }) {
  return (
    <div className="mx-auto max-w-[78rem] px-4 py-10 sm:px-6 lg:py-16">
      <Suspense fallback={<div className="h-64 animate-pulse rounded-3xl bg-card" />}>
        <Konto searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

async function Konto({ searchParams }: { searchParams: SP }) {
  await connection(); // Sitzung und Beiträge: immer zur Anfragezeit, nie vorab gerendert
  const sp = await searchParams;
  if (!forumEnabled()) return <p>Das Forum ist auf diesem Server noch nicht eingerichtet.</p>;
  const user = await currentUser();
  if (user) return <Account username={user.username} email={user.email} car={user.car} avatarPath={user.avatarPath} notify={(await profileFlags(user.id)).notifyReplies} />;
  return (
    <>
      <h1 className="text-4xl font-semibold tracking-[-0.03em] sm:text-5xl">Mitmachen im Forum</h1>
      <p className="mt-4 max-w-2xl text-lg">Lesen kann jeder. Zum Schreiben brauchst du ein kostenloses Konto mit E-Mail-Adresse und Passwort.</p>
      {sp.fehler === "link" && <p role="alert" className="mt-6 rounded-2xl bg-bad-soft p-4">Der Link ist abgelaufen oder ungültig. Bitte fordere einen neuen an.</p>}
      <div className="mt-10 grid gap-6 lg:grid-cols-2">
        <section className="rounded-3xl bg-card p-6 sm:p-8">
          <h2 className="text-2xl font-semibold">Anmelden</h2>
          <ActionForm action={signIn} submit="Anmelden" className="mt-6 space-y-4">
            {typeof sp.weiter === "string" && <input type="hidden" name="weiter" value={sp.weiter.slice(0, 6000)} />}
            <label className={labelCls}>E-Mail<Input name="email" type="email" autoComplete="email" required className="h-11" /></label>
            <label className={labelCls}>Passwort<Input name="password" type="password" autoComplete="current-password" required className="h-11" /></label>
          </ActionForm>
          <details className="mt-6">
            <summary className="cursor-pointer text-sm font-medium text-brand">Passwort vergessen?</summary>
            <ActionForm action={requestReset} submit="Link anfordern" hideOnSuccess className="mt-4 space-y-4">
              <label className={labelCls}>E-Mail<Input name="email" type="email" autoComplete="email" required className="h-11" /></label>
            </ActionForm>
          </details>
        </section>
        <section className="rounded-3xl bg-card p-6 sm:p-8">
          <h2 className="text-2xl font-semibold">Konto erstellen</h2>
          <ActionForm action={signUp} submit="Konto erstellen" hideOnSuccess className="mt-6 space-y-4">
            <label className={labelCls}>
              Benutzername <span className="font-normal text-muted-foreground">öffentlich sichtbar, nicht dein echter Name</span>
              <Input name="username" required minLength={3} maxLength={24} pattern="[A-Za-z0-9_.\-]{3,24}" autoComplete="username" className="h-11" />
            </label>
            <label className={labelCls}>E-Mail<Input name="email" type="email" autoComplete="email" required className="h-11" /></label>
            <label className={labelCls}>
              Passwort <span className="font-normal text-muted-foreground">mind. 10 Zeichen, Groß- und Kleinbuchstaben, eine Ziffer</span>
              <Input name="password" type="password" autoComplete="new-password" required minLength={10} className="h-11" />
            </label>
            <label className="flex items-start gap-3 text-sm">
              <input type="checkbox" name="terms" required className="mt-1 size-4 accent-[var(--primary)]" />
              <span>Ich akzeptiere die <Link href="/forum/regeln" className="text-brand underline">Forenregeln</Link> und habe die <Link href="/datenschutz" className="text-brand underline">Datenschutzerklärung</Link> gelesen.</span>
            </label>
            <label className="flex items-start gap-3 text-sm">
              <input type="checkbox" name="age" required className="mt-1 size-4 accent-[var(--primary)]" />
              <span>Ich bin mindestens 16 Jahre alt.</span>
            </label>
          </ActionForm>
        </section>
      </div>
    </>
  );
}

function Account({ username, email, car, avatarPath, notify }: { username: string | null; email: string | null; car: string | null; avatarPath: string | null; notify: boolean }) {
  return (
    <>
      <div className="flex items-center gap-5">
        <Avatar name={username} path={avatarPath} size={72} />
        <div>
          <h1 className="text-4xl font-semibold tracking-[-0.03em] sm:text-5xl">Hallo {username ?? "du"}</h1>
          <p className="mt-2 text-lg text-muted-foreground">Angemeldet als {email}</p>
        </div>
      </div>
      <div className="mt-8 flex flex-wrap gap-3">
        <Link href="/forum" className="inline-flex h-11 items-center rounded-full bg-primary px-6 font-medium text-primary-foreground">Zum Forum</Link>
        <Link href="/garage" className="inline-flex h-11 items-center rounded-full border border-input bg-card px-6 font-medium hover:bg-muted">Meine Garage</Link>
        <form action={signOut}>
          <Button type="submit" variant="outline" size="lg" className="h-11 px-6">Abmelden</Button>
        </form>
      </div>
      <section className="mt-12 max-w-xl rounded-3xl bg-card p-6 sm:p-8">
        <h2 className="text-2xl font-semibold">Dein Profil</h2>
        <p className="mt-2 text-muted-foreground">Freiwillig. Beides ist bei deinen Beiträgen öffentlich sichtbar.</p>

        <h3 className="mt-6 font-semibold">Profilbild</h3>
        <p className="mt-1 text-sm text-muted-foreground">Wird quadratisch zugeschnitten und verkleinert. Bitte kein Kennzeichen und keine fremden Personen.</p>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <AvatarUpload action={uploadAvatar} />
          {avatarPath && (
            <form action={removeAvatar}>
              <Button type="submit" variant="ghost" className="h-11 px-4 text-muted-foreground">Bild entfernen</Button>
            </form>
          )}
        </div>

        <h3 className="mt-8 font-semibold">Dein Auto</h3>
        <ActionForm action={updateCar} submit="Speichern" variant="outline" className="mt-3 space-y-3">
          <label className={labelCls}>
            Welches Auto fährst du? <span className="font-normal text-muted-foreground">z. B. „BMW 320d F31, 2015“ – leer lassen zum Entfernen</span>
            <Input name="car" defaultValue={car ?? ""} maxLength={60} className="h-11" />
          </label>
        </ActionForm>
      </section>

      <section className="mt-6 max-w-xl rounded-3xl bg-card p-6 sm:p-8">
        <h2 className="text-2xl font-semibold">Benachrichtigungen</h2>
        <p className="mt-2">
          E-Mail bei neuen Antworten auf deine Themen (höchstens eine pro Thema und Stunde): <strong>{notify ? "an" : "aus"}</strong>
        </p>
        <form action={setNotifyReplies} className="mt-4">
          <input type="hidden" name="on" value={notify ? "0" : "1"} />
          <Button type="submit" variant="outline" className="h-11 px-5">{notify ? "Ausschalten" : "Einschalten"}</Button>
        </form>
        <p className="mt-4 text-sm text-muted-foreground">
          Preisalarme für gemerkte Autos schaltest du unter <Link href="/analysen" className="text-brand underline">Meine Analysen</Link> ein oder aus.
        </p>
      </section>

      <section className="mt-6 max-w-xl rounded-3xl bg-card p-6 sm:p-8">
        <h2 className="text-2xl font-semibold">Konto löschen</h2>
        <p className="mt-2">Dein Konto, dein Profil und alle deine Beiträge werden endgültig gelöscht. Das lässt sich nicht rückgängig machen.</p>
        <ActionForm action={deleteAccount} submit="Konto endgültig löschen" variant="destructive" className="mt-6 space-y-4">
          <label className={labelCls}>Zur Sicherheit: dein Passwort<Input name="password" type="password" autoComplete="current-password" required className="h-11" /></label>
        </ActionForm>
      </section>
    </>
  );
}
