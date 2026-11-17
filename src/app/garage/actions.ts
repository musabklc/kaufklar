"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { parseDue } from "@/lib/analysis/garage";
import { currentUser, supabaseUser } from "@/lib/supabase/server";
import type { FormState } from "../konto/actions";

const MAX_CARS = 5;
const str = (f: FormData, k: string) => (typeof f.get(k) === "string" ? (f.get(k) as string).trim() : "");
const int = (s: string) => (s.replace(/\D/g, "") ? Number(s.replace(/\D/g, "")) : null);

const Car = z.object({
  title: z.string().min(2, "Bitte gib dem Auto einen Namen, z. B. „BMW 320d F31“.").max(80),
  year: z.number().int().min(1950).max(2100).nullable(),
  mileage_km: z.number().int().min(0).max(3_000_000).nullable(),
  hu_due: z.string().nullable(),
  service_due: z.string().nullable(),
  belt_due: z.string().nullable(),
  notes: z.string().max(300).nullable(),
});

/** Formular → geprüfte Daten. Termine als "05/2027" (wie im Fahrzeugschein) oder Datum. */
function read(f: FormData): z.infer<typeof Car> | string {
  const dates = { hu_due: str(f, "hu"), service_due: str(f, "service"), belt_due: str(f, "belt") };
  const parsed = Object.fromEntries(Object.entries(dates).map(([k, v]) => [k, parseDue(v)])) as Record<keyof typeof dates, string | null>;
  const bad = Object.entries(dates).find(([k, v]) => v && !parsed[k as keyof typeof dates]);
  if (bad) return "Termine bitte als Monat/Jahr (z. B. 05/2027) oder Datum (z. B. 12.05.2027).";
  const r = Car.safeParse({ title: str(f, "title"), year: int(str(f, "year")), mileage_km: int(str(f, "km")), ...parsed, notes: str(f, "notes") || null });
  return r.success ? r.data : (r.error.issues[0]?.message ?? "Bitte die Eingaben prüfen.");
}

export async function addCar(_: FormState, f: FormData): Promise<FormState> {
  const user = await currentUser();
  if (!user) return { message: "Bitte melde dich an." };
  const car = read(f);
  if (typeof car === "string") return { message: car };
  const sb = await supabaseUser();
  const { count } = await sb.from("garage_cars").select("id", { count: "exact", head: true });
  if ((count ?? 0) >= MAX_CARS) return { message: `Höchstens ${MAX_CARS} Autos in der Garage.` };
  const { error } = await sb.from("garage_cars").insert(car);
  if (error) return { message: "Speichern hat nicht geklappt." };
  // Erstes Auto und noch kein Auto im Forum-Profil? Dann dort mit eintragen.
  if (!user.car && !count) await sb.from("profiles").update({ car: car.title.slice(0, 60) }).eq("id", user.id);
  revalidatePath("/garage");
  return { ok: true, message: "Auto hinzugefügt." };
}

export async function updateGarageCar(_: FormState, f: FormData): Promise<FormState> {
  if (!(await currentUser())) return { message: "Bitte melde dich an." };
  const id = z.string().uuid().safeParse(str(f, "id"));
  const car = read(f);
  if (!id.success) return { message: "Unbekanntes Auto." };
  if (typeof car === "string") return { message: car };
  const sb = await supabaseUser();
  const { error } = await sb.from("garage_cars").update(car).eq("id", id.data);
  if (error) return { message: "Speichern hat nicht geklappt." };
  revalidatePath("/garage");
  return { ok: true, message: "Gespeichert." };
}

export async function deleteGarageCar(f: FormData) {
  const id = z.string().uuid().safeParse(str(f, "id"));
  if (!id.success || !(await currentUser())) return;
  const sb = await supabaseUser();
  await sb.from("garage_cars").delete().eq("id", id.data);
  revalidatePath("/garage");
}
