import { runWatch } from "@/lib/server/watch";

export const maxDuration = 60;

/** Täglicher Preisalarm für gemerkte Autos. Nur mit CRON_SECRET (Vercel sendet ihn automatisch). */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) return new Response("Unauthorized", { status: 401 });
  return Response.json(await runWatch(20));
}
