"use server";

import { z } from "zod";
import { currentUser } from "@/lib/supabase/server";
import { deleteAnalysis, getAnalysis } from "@/lib/server/analyses";
import type { AnalysisResult } from "@/lib/types";

const Id = z.string().uuid();

/** Analyse vom Server laden (Link auf anderem Gerät oder geteilt). */
export async function loadAnalysis(id: string): Promise<AnalysisResult | null> {
  if (!Id.safeParse(id).success) return null;
  return (await getAnalysis(id))?.result ?? null;
}

export async function removeAnalysis(id: string): Promise<boolean> {
  if (!Id.safeParse(id).success) return false;
  return deleteAnalysis(id, (await currentUser())?.id ?? null);
}
