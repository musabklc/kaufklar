"use server";

import { z } from "zod";
import { currentUser, supabaseUser } from "@/lib/supabase/server";
import type { AnalysisResult } from "@/lib/types";

const MAX_SAVED = 50;
const MAX_BYTES = 350_000;
const Id = z.string().uuid();

export type SavedState = { loggedIn: boolean; saved: boolean; watch: boolean };
export type SavedItem = { id: string; title: string; priceEur: number | null; lastPrice: number | null; watch: boolean; gone: boolean; createdAt: string; hasLink: boolean };

/** Ist diese Analyse im Konto gemerkt? */
export async function savedState(id: string): Promise<SavedState> {
  const user = await currentUser();
  if (!user || !Id.safeParse(id).success) return { loggedIn: Boolean(user), saved: false, watch: false };
  const sb = await supabaseUser();
  const { data } = await sb.from("saved_analyses").select("watch").eq("id", id).maybeSingle();
  return { loggedIn: true, saved: Boolean(data), watch: data?.watch ?? false };
}

/** Analyse im Konto speichern (oder aktualisieren). watch = Preisalarm per E-Mail. */
export async function saveToAccount(json: string, watch: boolean): Promise<{ ok: boolean; message?: string }> {
  const user = await currentUser();
  if (!user) return { ok: false, message: "Bitte melde dich an." };
  if (json.length > MAX_BYTES) return { ok: false, message: "Die Analyse ist zu groß zum Speichern." };
  let a: AnalysisResult;
  try {
    a = JSON.parse(json);
  } catch {
    return { ok: false, message: "Ungültige Analyse." };
  }
  if (!Id.safeParse(a?.id).success || typeof a.vehicle !== "object" || !a.vehicle) return { ok: false, message: "Ungültige Analyse." };
  const v = a.vehicle;
  const title = [v.make, v.model, v.variant].filter(Boolean).join(" ").slice(0, 120) || "Fahrzeug";
  const listingUrl = typeof v.listingUrl === "string" && /^https:\/\//.test(v.listingUrl) ? v.listingUrl.slice(0, 2000) : null;
  const priceEur = Number.isInteger(v.priceEur) ? v.priceEur : null;
  const sb = await supabaseUser();
  const { data: existing } = await sb.from("saved_analyses").select("id").eq("id", a.id).maybeSingle();
  if (existing) {
    const { error } = await sb.from("saved_analyses").update({ data: a, title, watch: watch && Boolean(listingUrl) }).eq("id", a.id);
    return error ? { ok: false, message: "Speichern hat nicht geklappt." } : { ok: true };
  }
  const { count } = await sb.from("saved_analyses").select("id", { count: "exact", head: true });
  if ((count ?? 0) >= MAX_SAVED) return { ok: false, message: `Höchstens ${MAX_SAVED} gemerkte Autos. Bitte erst eins entfernen.` };
  const { error } = await sb.from("saved_analyses").insert({ id: a.id, data: a, title, listing_url: listingUrl, price_eur: priceEur, watch: watch && Boolean(listingUrl) });
  return error ? { ok: false, message: "Speichern hat nicht geklappt." } : { ok: true };
}

export async function setWatch(id: string, watch: boolean): Promise<boolean> {
  if (!Id.safeParse(id).success || !(await currentUser())) return false;
  const sb = await supabaseUser();
  const { error } = await sb.from("saved_analyses").update({ watch }).eq("id", id).not("listing_url", "is", null);
  return !error;
}

export async function removeSaved(id: string): Promise<boolean> {
  if (!Id.safeParse(id).success || !(await currentUser())) return false;
  const sb = await supabaseUser();
  const { error } = await sb.from("saved_analyses").delete().eq("id", id);
  return !error;
}

/** Gemerkte Analyse laden, z. B. auf einem anderen Gerät. */
export async function loadSaved(id: string): Promise<AnalysisResult | null> {
  if (!Id.safeParse(id).success || !(await currentUser())) return null;
  const sb = await supabaseUser();
  const { data } = await sb.from("saved_analyses").select("data").eq("id", id).maybeSingle();
  return (data?.data as AnalysisResult | undefined) ?? null;
}

export async function listSaved(): Promise<SavedItem[] | null> {
  if (!(await currentUser())) return null;
  const sb = await supabaseUser();
  const { data } = await sb
    .from("saved_analyses")
    .select("id, title, price_eur, last_price, watch, gone_at, created_at, listing_url")
    .order("created_at", { ascending: false })
    .limit(MAX_SAVED);
  return (data ?? []).map((r) => ({
    id: r.id,
    title: r.title,
    priceEur: r.price_eur,
    lastPrice: r.last_price,
    watch: r.watch,
    gone: Boolean(r.gone_at),
    createdAt: r.created_at,
    hasLink: Boolean(r.listing_url),
  }));
}
