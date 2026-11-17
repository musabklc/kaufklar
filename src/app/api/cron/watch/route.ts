import { runGarage } from "@/lib/server/garage";
import { runWatch } from "@/lib/server/watch";
import { cleanupAnalyses } from "@/lib/server/analyses";
import { cleanupRateHits } from "@/lib/server/usage";

export const maxDuration = 60;

/** Täglich: Preisalarm, Garagen-Erinnerungen und Löschen alter Analysen ohne Konto. Nur mit CRON_SECRET. */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) return new Response("Unauthorized", { status: 401 });
  const [watch, garage, analysesDeleted] = await Promise.all([runWatch(20), runGarage(), cleanupAnalyses(), cleanupRateHits()]);
  return Response.json({ ...watch, garage, analysesDeleted });
}
