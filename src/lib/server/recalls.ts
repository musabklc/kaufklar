import "server-only";
import { createClient } from "@supabase/supabase-js";
import { parseYear } from "../analysis/knowledge";
import { matchRecalls, recallBrand, type MatchedRecall, type Recall } from "../analysis/recalls";
import type { Vehicle } from "../types";

const db = process.env.SUPABASE_URL && process.env.SUPABASE_SECRET_KEY ? createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SECRET_KEY) : null;

/** EU-Rückrufe (Safety Gate) zu diesem Fahrzeug. Fehler blockieren die Analyse nie. */
export async function recallsFor(v: Vehicle, typeApprovals: string[]): Promise<MatchedRecall[]> {
  const brand = recallBrand(v.make);
  if (!db || !brand || !/^[\p{L}0-9 -]{2,30}$/u.test(brand)) return [];
  const { data, error } = await db.from("recalls_eu").select("*").ilike("brand", `%${brand}%`).order("published", { ascending: false }).limit(1000);
  if (error) {
    console.warn("recalls lookup failed", error.message);
    return [];
  }
  return matchRecalls(v, typeApprovals, (data ?? []) as Recall[], parseYear(v.firstRegistration));
}
