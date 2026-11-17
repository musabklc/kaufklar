import { NextResponse, type NextRequest } from "next/server";
import { sharedListingUrl } from "@/lib/share";

/** Ziel von "Teilen → Tachoklar": Apps schicken den Link mal in url, mal mitten im Text. */
export function GET(req: NextRequest) {
  const p = req.nextUrl.searchParams;
  const link = sharedListingUrl([p.get("url"), p.get("text"), p.get("title")]);
  const to = new URL("/", req.nextUrl.origin);
  if (link) to.searchParams.set("link", link);
  to.hash = "pruefen";
  return NextResponse.redirect(to);
}
