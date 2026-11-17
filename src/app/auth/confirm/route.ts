import { type EmailOtpType } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";
import { supabaseUser } from "@/lib/supabase/server";

const TYPES = new Set<EmailOtpType>(["signup", "email", "recovery", "email_change", "invite", "magiclink"]);

/** Bestätigungs- und Passwort-Links aus den E-Mails (token_hash). Leitet nur auf eigene Pfade weiter. */
export async function GET(request: NextRequest) {
  const url = request.nextUrl;
  const tokenHash = url.searchParams.get("token_hash");
  const type = url.searchParams.get("type") as EmailOtpType | null;
  const nextParam = url.searchParams.get("next") ?? "/forum";
  const next = nextParam.startsWith("/") && !nextParam.startsWith("//") ? nextParam : "/forum"; // kein offener Redirect
  const code = url.searchParams.get("code");
  const sb = await supabaseUser();
  // Standard-Vorlagen von Supabase schicken ?code= (PKCE), eigene Vorlagen ?token_hash=
  if (code) {
    const { error } = await sb.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(new URL(next, url.origin));
  } else if (tokenHash && type && TYPES.has(type)) {
    const { error } = await sb.auth.verifyOtp({ type, token_hash: tokenHash });
    if (!error) return NextResponse.redirect(new URL(next, url.origin));
  }
  return NextResponse.redirect(new URL("/konto?fehler=link", url.origin));
}
