import { runGarage } from "@/lib/server/garage";
import { runWatch } from "@/lib/server/watch";

export const maxDuration = 60;

/** Täglich: Preisalarm für gemerkte Autos und Termin-Erinnerungen aus der Garage. Nur mit CRON_SECRET. */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) return new Response("Unauthorized", { status: 401 });
  const [watch, garage] = await Promise.all([runWatch(20), runGarage()]);
  return Response.json({ ...watch, garage });
}
