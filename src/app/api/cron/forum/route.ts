import { classifyPending } from "@/lib/server/forum-insights";

export const maxDuration = 60;

/** Täglich: Forumsbeiträge nachlesen, bei denen die KI beim Schreiben nicht erreichbar war. Nur mit CRON_SECRET. */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) return new Response("Unauthorized", { status: 401 });
  return Response.json(await classifyPending(15));
}
