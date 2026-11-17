"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { BookOpenCheck, Camera, CheckCircle2, Loader2, X } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { shrinkPhoto } from "@/lib/client-image";
import { saveAnalysis, useAnalysis, useChecked } from "@/lib/storage";
import type { AnalysisResult } from "@/lib/types";
import { InspectionResult, ServiceBookResult } from "@/components/analysis/inspection-summary";

const AREAS = [
  "Reifen vorne links", "Reifen vorne rechts", "Reifen hinten links", "Reifen hinten rechts",
  "Tacho/Cockpit bei laufendem Motor", "Motorraum", "Rost: Schweller/Radläufe", "Unterboden", "Bremsscheiben",
  "Karosserie/Spaltmaße", "Innenraum/Sitze", "Sonstiges",
];
const MAX = 6;

type Shot = { file: File; url: string; label: string };

function useShots() {
  const [shots, setShots] = useState<Shot[]>([]);
  useEffect(() => () => shots.forEach((s) => URL.revokeObjectURL(s.url)), [shots]);
  async function add(list: FileList | null, label: string) {
    const files = [...(list ?? [])].slice(0, MAX - shots.length);
    const small = (await Promise.all(files.map((f) => shrinkPhoto(f)))).filter((f): f is File => f !== null);
    setShots((s) => [...s, ...small.map((file) => ({ file, url: URL.createObjectURL(file), label }))].slice(0, MAX));
  }
  return { shots, add, remove: (i: number) => setShots((s) => s.filter((_, n) => n !== i)), clear: () => setShots([]) };
}

async function send(r: AnalysisResult, mode: "fotos" | "scheckheft", shots: Shot[]) {
  const f = new FormData();
  f.set("mode", mode);
  f.set("vehicle", JSON.stringify(r.vehicle));
  f.set("labels", JSON.stringify(shots.map((s) => s.label)));
  shots.forEach((s) => f.append("images", s.file));
  const res = await fetch("/api/besichtigung", { method: "POST", body: f });
  const data = await res.json().catch(() => ({ error: "Antwort nicht lesbar." }));
  if (!res.ok) throw new Error(data.error ?? "Das hat nicht geklappt.");
  return data;
}

function Thumbs({ shots, remove }: { shots: Shot[]; remove: (i: number) => void }) {
  if (!shots.length) return null;
  return (
    <ul className="mt-4 grid grid-cols-3 gap-3 sm:grid-cols-6">
      {shots.map((s, i) => (
        <li key={s.url} className="relative">
          {/* eslint-disable-next-line @next/next/no-img-element -- lokale Vorschau */}
          <img src={s.url} alt={s.label} className="aspect-square w-full rounded-xl object-cover" />
          <p className="mt-1 truncate text-xs text-muted-foreground">{i + 1}. {s.label}</p>
          <button type="button" aria-label={`Foto ${i + 1} entfernen`} onClick={() => remove(i)} className="absolute -top-2 -right-2 inline-flex size-7 items-center justify-center rounded-full bg-foreground text-background">
            <X className="size-4" />
          </button>
        </li>
      ))}
    </ul>
  );
}

export function InspectionMode({ id }: { id: string }) {
  const r = useAnalysis(id);
  const [checked, setChecked] = useChecked(id);
  const photos = useShots();
  const book = useShots();
  const [area, setArea] = useState(AREAS[0]);
  const [busy, setBusy] = useState<null | "fotos" | "scheckheft">(null);
  const [error, setError] = useState<string | null>(null);
  const total = useMemo(() => r?.checklist.reduce((n, s) => n + s.items.length, 0) ?? 0, [r]);

  if (r === undefined) return <div className="mx-auto max-w-3xl px-4 py-20 text-sm text-muted-foreground">Lade …</div>;
  if (!r) return <div className="mx-auto max-w-3xl px-4 py-20">Analyse nicht gefunden. <Link href="/analysen" className="text-brand underline">Meine Analysen</Link></div>;
  const name = [r.vehicle.make, r.vehicle.model, r.vehicle.variant].filter(Boolean).join(" ");

  async function run(mode: "fotos" | "scheckheft") {
    setBusy(mode);
    setError(null);
    try {
      const data = await send(r!, mode, mode === "fotos" ? photos.shots : book.shots);
      saveAnalysis(mode === "fotos" ? { ...r!, inspection: data } : { ...r!, serviceBook: data });
      (mode === "fotos" ? photos : book).clear();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="mx-auto max-w-3xl px-4 pb-24 pt-6 sm:px-6 sm:pt-10">
      <Link href={`/analyse/${id}`} className="text-sm font-medium text-brand">← Zur Analyse</Link>
      <h1 className="mt-3 text-3xl font-semibold tracking-[-0.03em] sm:text-5xl">Besichtigung</h1>
      <p className="mt-2 text-lg text-muted-foreground">{name}</p>
      {error && <p role="alert" className="mt-4 rounded-2xl bg-bad-soft p-4">{error}</p>}

      {/* 1. Fotos vom Auto */}
      <section className="mt-8 rounded-3xl bg-card p-5 sm:p-6">
        <h2 className="flex items-center gap-2 text-xl font-semibold"><Camera className="size-5" /> Fotos bewerten lassen</h2>
        <p className="mt-1 text-sm text-muted-foreground">Bis zu {MAX} Fotos: Reifen (mit DOT-Nummer), Rost, Tacho mit laufendem Motor, Motorraum. Die Fotos gehen nur an die KI und werden nicht gespeichert.</p>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <label className="text-sm font-medium">
            Was fotografierst du?
            <select value={area} onChange={(e) => setArea(e.target.value)} className="mt-1 block h-11 rounded-xl border border-input bg-background px-3 text-base">
              {AREAS.map((a) => <option key={a}>{a}</option>)}
            </select>
          </label>
          {photos.shots.length < MAX && (
            <label className="mt-5 inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-full bg-primary px-5 font-medium text-primary-foreground">
              <Camera className="size-4" /> Foto aufnehmen
              <input type="file" accept="image/*" capture="environment" className="sr-only" onChange={(e) => { void photos.add(e.target.files, area); e.target.value = ""; }} />
            </label>
          )}
        </div>
        <Thumbs shots={photos.shots} remove={photos.remove} />
        {photos.shots.length > 0 && (
          <button type="button" disabled={busy !== null} onClick={() => run("fotos")} className="mt-5 inline-flex h-12 items-center gap-2 rounded-full bg-foreground px-6 font-medium text-background disabled:opacity-60">
            {busy === "fotos" && <Loader2 className="size-4 animate-spin" />} {busy === "fotos" ? "KI schaut sich die Fotos an …" : `${photos.shots.length} ${photos.shots.length === 1 ? "Foto" : "Fotos"} bewerten`}
          </button>
        )}
        {r.inspection && <div className="mt-6"><InspectionResult i={r.inspection} /></div>}
      </section>

      {/* 2. Scheckheft */}
      <section className="mt-6 rounded-3xl bg-card p-5 sm:p-6">
        <h2 className="flex items-center gap-2 text-xl font-semibold"><BookOpenCheck className="size-5" /> Scheckheft prüfen</h2>
        <p className="mt-1 text-sm text-muted-foreground">Fotografiere die Seiten mit Stempeln (bis zu {MAX}). Tachoklar liest Datum und Kilometer ab und prüft, ob alles zusammenpasst – auch gegen gedrehte Tachos.</p>
        {book.shots.length < MAX && (
          <label className="mt-4 inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-full bg-primary px-5 font-medium text-primary-foreground">
            <Camera className="size-4" /> Seite fotografieren
            <input type="file" accept="image/*" capture="environment" multiple className="sr-only" onChange={(e) => { void book.add(e.target.files, "Scheckheft"); e.target.value = ""; }} />
          </label>
        )}
        <Thumbs shots={book.shots} remove={book.remove} />
        {book.shots.length > 0 && (
          <button type="button" disabled={busy !== null} onClick={() => run("scheckheft")} className="mt-5 inline-flex h-12 items-center gap-2 rounded-full bg-foreground px-6 font-medium text-background disabled:opacity-60">
            {busy === "scheckheft" && <Loader2 className="size-4 animate-spin" />} {busy === "scheckheft" ? "Lese Scheckheft …" : "Scheckheft prüfen"}
          </button>
        )}
        {r.serviceBook && <div className="mt-6"><ServiceBookResult b={r.serviceBook} /></div>}
      </section>

      {/* 3. Checkliste zum Abhaken */}
      <section className="mt-6 rounded-3xl bg-card p-5 sm:p-6">
        <h2 className="flex items-center gap-2 text-xl font-semibold"><CheckCircle2 className="size-5" /> Checkliste <span className="text-base font-normal text-muted-foreground">({checked.length}/{total})</span></h2>
        {r.checklist.map((s) => (
          <div key={s.area} className="mt-5">
            <h3 className="font-semibold">{s.area}</h3>
            <ul className="mt-2 space-y-1">
              {s.items.map((it) => (
                <li key={it.id}>
                  <label className="flex min-h-11 cursor-pointer items-start gap-3 rounded-xl px-2 py-2 hover:bg-muted">
                    <Checkbox checked={checked.includes(it.id)} onCheckedChange={(on) => setChecked(on ? [...checked, it.id] : checked.filter((x) => x !== it.id))} className="mt-0.5" />
                    <span className={checked.includes(it.id) ? "text-muted-foreground line-through" : ""}>{it.text}</span>
                  </label>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </section>
    </div>
  );
}
