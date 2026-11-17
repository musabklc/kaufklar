import "server-only";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

// Publishable Key ist öffentlich; Vercel-Variable heißt ohne NEXT_PUBLIC_-Präfix, wird nur serverseitig gelesen
const publishableKey = () => process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.SUPABASE_PUBLISHABLE_KEY;
export const forumEnabled = () => Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && publishableKey());

/** Supabase mit der Sitzung des Besuchers (Publishable Key + RLS). Pro Anfrage neu erzeugen. */
export async function supabaseUser() {
  const store = await cookies();
  return createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, publishableKey()!, {
    cookies: {
      getAll: () => store.getAll(),
      setAll(list) {
        // In Server Components nicht erlaubt – die Proxy-Datei erneuert die Sitzung ohnehin bei jeder Anfrage.
        try {
          list.forEach(({ name, value, options }) => store.set(name, value, options));
        } catch {}
      },
    },
  });
}

/** Angemeldeter Nutzer, Token serverseitig geprüft (getClaims), oder null. */
export async function currentUser() {
  if (!forumEnabled()) return null;
  const sb = await supabaseUser();
  const { data } = await sb.auth.getClaims();
  const id = data?.claims?.sub;
  if (!id) return null;
  const { data: profile } = await sb.from("profiles").select("username, car, avatar_path").eq("id", id).maybeSingle();
  // Gelöschtes Konto: das Token bleibt bis zum Ablauf formal gültig, das Profil ist aber weg → gilt als abgemeldet
  if (!profile) return null;
  return {
    id,
    email: (data.claims.email as string | undefined) ?? null,
    username: profile?.username ?? null,
    car: (profile?.car as string | null) ?? null,
    avatarPath: (profile?.avatar_path as string | null) ?? null,
  };
}
