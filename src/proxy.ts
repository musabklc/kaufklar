import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/** Erneuert die Forum-Sitzung (Supabase Auth) bei jeder Anfrage auf Forum- und Konto-Seiten. */
export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.SUPABASE_PUBLISHABLE_KEY;
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !key) return response;
  const supabase = createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL, key, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll(list, headers) {
        list.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        list.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        // Verhindert, dass ein CDN eine Antwort mit Sitzungs-Cookie für andere zwischenspeichert
        Object.entries(headers ?? {}).forEach(([k, v]) => response.headers.set(k, v));
      },
    },
  });
  await supabase.auth.getClaims();
  return response;
}

export const config = { matcher: ["/forum/:path*", "/konto/:path*", "/auth/:path*"] };
