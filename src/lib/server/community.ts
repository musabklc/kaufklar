import "server-only";
import { createHash } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { parseYear } from "../analysis/knowledge";
import { aggregateReports, type CommunityIssue, type ReportRow } from "../analysis/community";
import type { Vehicle } from "../types";

const db = process.env.SUPABASE_URL && process.env.SUPABASE_SECRET_KEY ? createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SECRET_KEY) : null;
export const communityEnabled = () => db !== null;
export const norm = (s: string | null | undefined) => (s ?? "").toLowerCase().replace(/\s+/g, " ").trim();

/** Anonymer, gesalzener Fingerabdruck des Melders – zählt unabhängige Melder, ohne IP zu speichern. */
export function reporterHash(req: Request) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0].trim() || "local";
  const salt = process.env.REPORT_SALT || process.env.SUPABASE_SECRET_KEY || "kaufklar";
  return createHash("sha256").update(`${salt}|${ip}|${req.headers.get("user-agent") ?? ""}`).digest("hex").slice(0, 32);
}

export async function saveReport(row: Omit<ReportRow, "canonical_title"> & {
  make: string; model: string; description: string; status: "approved" | "rejected" | "pending"; canonical_title: string | null; moderation_note: string;
}) {
  if (!db) throw new Error("Datenbank nicht konfiguriert");
  const { error } = await db.from("problem_reports").insert({ ...row, make: norm(row.make), model: norm(row.model) });
  if (error) throw new Error(error.message);
}

/** Älteste ungeprüfte Meldungen (z. B. weil die KI beim Eingang ausgelastet war). */
export async function oldestPending(limit: number) {
  if (!db) return [];
  const { data } = await db.from("problem_reports").select("id, make, model, engine_code, year, component, description").eq("status", "pending").order("created_at").limit(limit);
  return (data ?? []) as { id: number; make: string; model: string; engine_code: string | null; year: number | null; component: string; description: string }[];
}

export async function updateReport(id: number, patch: Record<string, unknown>) {
  if (!db) return;
  const { error } = await db.from("problem_reports").update(patch).eq("id", id);
  if (error) throw new Error(error.message);
}

/** Wie viele Meldungen hat dieser Melder in den letzten 24 h abgegeben? (Schutz vor Massenmeldungen) */
export async function recentReportsBy(hash: string) {
  if (!db) return 0;
  const { count } = await db.from("problem_reports").select("id", { count: "exact", head: true }).eq("reporter_hash", hash).gte("created_at", new Date(Date.now() - 864e5).toISOString());
  return count ?? 0;
}

/** Freigegebene Kundenmeldungen zu diesem Modell, zusammengefasst (nur mit genug unabhängigen Meldern). */
export async function communityIssuesFor(v: Vehicle): Promise<CommunityIssue[]> {
  if (!db || !v.make || !v.model) return [];
  const { data, error } = await db
    .from("problem_reports")
    .select("canonical_title, component, engine_code, year, mileage_km, cost_eur, reporter_hash")
    .eq("status", "approved")
    .eq("make", norm(v.make))
    .eq("model", norm(v.model))
    .limit(2000);
  if (error) {
    console.warn("community lookup failed", error.message);
    return [];
  }
  return aggregateReports((data ?? []) as ReportRow[], v, parseYear(v.firstRegistration));
}
