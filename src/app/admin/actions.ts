"use server";

import { revalidatePath } from "next/cache";
import { currentUser } from "@/lib/supabase/server";
import { profileFlags, serviceDb } from "@/lib/server/forum-admin";

/** Schlechte Recherche löschen – der Typ wird bei der nächsten Analyse neu recherchiert. */
export async function deleteResearch(form: FormData) {
  const user = await currentUser();
  if (!user || !(await profileFlags(user.id)).isAdmin) return;
  const key = String(form.get("key") ?? "");
  if (key) await serviceDb()!.from("model_research").delete().eq("key", key);
  revalidatePath("/admin");
}
