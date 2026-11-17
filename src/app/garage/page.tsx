import { Suspense } from "react";
import { connection } from "next/server";
import Link from "next/link";
import { CalendarClock } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ActionForm, labelCls } from "@/components/forum/action-form";
import { currentUser, forumEnabled, supabaseUser } from "@/lib/supabase/server";
import { addCar, deleteGarageCar, updateGarageCar } from "./actions";

export const metadata = { title: "Meine Garage – Tachoklar", description: "Deine Autos mit HU-, Service- und Zahnriemen-Terminen und Erinnerung per E-Mail.", robots: { index: false } };

type SP = Promise<Record<string, string | string[] | undefined>>;

export default function GaragePage({ searchParams }: { searchParams: SP }) {
  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6 lg:py-16">
      <h1 className="text-4xl font-semibold tracking-[-0.03em] sm:text-6xl">Meine Garage</h1>
      <p className="mt-4 max-w-2xl text-lg">Trag deine Autos mit HU-, Service- und Zahnriemen-Termin ein. Wir erinnern dich per E-Mail rechtzeitig vorher.</p>
      <Suspense fallback={<div className="mt-8 h-64 animate-pulse rounded-3xl bg-card" />}>
        <Garage searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

type Car = { id: string; title: string; year: number | null; mileage_km: number | null; hu_due: string | null; service_due: string | null; belt_due: string | null; notes: string | null };
const de = (iso: string | null) => (iso ? new Date(`${iso}T00:00:00Z`).toLocaleDateString("de-DE", { timeZone: "UTC" }) : "");
const daysUntil = (iso: string) => Math.round((new Date(`${iso}T00:00:00Z`).getTime() - Date.now()) / 864e5);
const one = (x: string | string[] | undefined) => (typeof x === "string" ? x.slice(0, 80) : "");

function CarFields({ car }: { car?: Partial<Car> }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <label className={`${labelCls} sm:col-span-2`}>Auto<Input name="title" required minLength={2} maxLength={80} defaultValue={car?.title ?? ""} placeholder="z. B. BMW 320d F31" className="h-11" /></label>
      <label className={labelCls}>Baujahr<Input name="year" inputMode="numeric" defaultValue={car?.year ?? ""} className="h-11" /></label>
      <label className={labelCls}>Kilometerstand<Input name="km" inputMode="numeric" defaultValue={car?.mileage_km ?? ""} className="h-11" /></label>
      <label className={labelCls}>HU/TÜV fällig <span className="font-normal text-muted-foreground">z. B. 05/2027</span><Input name="hu" defaultValue={de(car?.hu_due ?? null)} className="h-11" /></label>
      <label className={labelCls}>Nächste Inspektion<Input name="service" defaultValue={de(car?.service_due ?? null)} placeholder="z. B. 03/2027" className="h-11" /></label>
      <label className={labelCls}>Zahnriemen fällig <span className="font-normal text-muted-foreground">falls vorhanden</span><Input name="belt" defaultValue={de(car?.belt_due ?? null)} className="h-11" /></label>
      <label className={labelCls}>Notiz<Input name="notes" maxLength={300} defaultValue={car?.notes ?? ""} placeholder="z. B. Bremsen vorne bald" className="h-11" /></label>
    </div>
  );
}

async function Garage({ searchParams }: { searchParams: SP }) {
  await connection();
  if (!forumEnabled()) return <p className="mt-8">Die Garage ist auf diesem Server nicht eingerichtet.</p>;
  const user = await currentUser();
  const sp = await searchParams;
  if (!user)
    return (
      <p className="mt-8 rounded-3xl bg-card p-6 text-lg">
        <Link href="/konto?weiter=%2Fgarage" className="font-medium text-brand underline">Melde dich an</Link>, um deine Autos einzutragen. Ein Konto ist kostenlos.
      </p>
    );
  const sb = await supabaseUser();
  const { data } = await sb.from("garage_cars").select("id, title, year, mileage_km, hu_due, service_due, belt_due, notes").order("created_at");
  const cars = (data ?? []) as Car[];
  const draft = { title: one(sp.titel), year: Number(one(sp.jahr)) || null, mileage_km: Number(one(sp.km)) || null };
  return (
    <>
      <ul className="mt-10 space-y-4">
        {cars.map((c) => {
          const due = ([["HU/TÜV", c.hu_due], ["Inspektion", c.service_due], ["Zahnriemen", c.belt_due]] as const).filter(([, d]) => d);
          return (
            <li key={c.id} className="rounded-3xl bg-card p-6">
              <h2 className="text-2xl font-semibold">{c.title}</h2>
              <p className="mt-1 text-muted-foreground">{[c.year, c.mileage_km && `${c.mileage_km.toLocaleString("de-DE")} km`].filter(Boolean).join(" · ")}</p>
              {due.length > 0 && (
                <ul className="mt-4 flex flex-wrap gap-2 text-sm">
                  {due.map(([label, d]) => {
                    const n = daysUntil(d!);
                    return (
                      <li key={label} className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 ${n < 0 ? "bg-bad-soft text-bad" : n <= 30 ? "bg-warn-soft" : "bg-muted"}`}>
                        <CalendarClock className="size-4" /> {label}: {de(d)} {n < 0 ? "(überfällig)" : n <= 30 ? `(in ${n} Tagen)` : ""}
                      </li>
                    );
                  })}
                </ul>
              )}
              {c.notes && <p className="mt-3">{c.notes}</p>}
              <details className="mt-4">
                <summary className="cursor-pointer text-sm font-medium text-brand">Bearbeiten</summary>
                <ActionForm action={updateGarageCar} submit="Speichern" variant="outline" className="mt-4 space-y-4">
                  <input type="hidden" name="id" value={c.id} />
                  <CarFields car={c} />
                </ActionForm>
                <form action={deleteGarageCar} className="mt-3">
                  <input type="hidden" name="id" value={c.id} />
                  <Button type="submit" variant="ghost" className="h-11 px-4 text-muted-foreground">Aus der Garage entfernen</Button>
                </form>
              </details>
            </li>
          );
        })}
      </ul>
      <section className="mt-8 rounded-3xl bg-card p-6 sm:p-8">
        <h2 className="text-2xl font-semibold">{cars.length ? "Weiteres Auto eintragen" : "Erstes Auto eintragen"}</h2>
        <p className="mt-2 text-muted-foreground">Erinnerung: HU und Zahnriemen 30 Tage, Inspektion 14 Tage vorher. Den HU-Termin findest du im Fahrzeugschein und auf der Plakette.</p>
        <ActionForm action={addCar} submit="Hinzufügen" hideOnSuccess={false} className="mt-6 space-y-4">
          <CarFields car={draft} />
        </ActionForm>
      </section>
    </>
  );
}
