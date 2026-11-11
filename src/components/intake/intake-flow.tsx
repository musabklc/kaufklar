"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, ImagePlus, Link2, Loader2, PenLine, X, AlertTriangle, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { saveAnalysis } from "@/lib/storage";
import type { AnalysisResult, Extraction, Vehicle } from "@/lib/types";
import { VehicleForm, EMPTY_VEHICLE } from "./vehicle-form";
import { CompsInput } from "./comps-input";
import { compressImage, MAX_UPLOAD_BYTES } from "./compress";

type Mode = "link" | "bilder" | "manuell";
const MODES: { id: Mode; label: string; icon: typeof Link2 }[] = [
  { id: "link", label: "Link", icon: Link2 },
  { id: "bilder", label: "Screenshots", icon: ImagePlus },
  { id: "manuell", label: "Manuell", icon: PenLine },
];

export function IntakeFlow({ aiEnabled, linkEnabled }: { aiEnabled: boolean; linkEnabled: boolean }) {
  const router = useRouter();
  const [step, setStep] = useState<"input" | "review">("input");
  const [mode, setMode] = useState<Mode>(!aiEnabled ? "manuell" : linkEnabled ? "link" : "bilder");
  const [url, setUrl] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [vehicle, setVehicle] = useState<Vehicle>(EMPTY_VEHICLE);
  const [uncertain, setUncertain] = useState<string[]>([]);
  const [comps, setComps] = useState<number[]>([]);
  const [busy, setBusy] = useState<null | "extract" | "analyze">(null);
  const [error, setError] = useState<string | null>(null);
  const [origin, setOrigin] = useState<Mode>("manuell");
  const [seal, setSeal] = useState<string | null>(null);

  async function addFiles(list: FileList | null) {
    if (!list) return;
    setError(null);
    const imgs = [...list].filter((f) => f.type.startsWith("image/"));
    const compressed = await Promise.all(imgs.map(compressImage));
    if (files.length + compressed.length > 8) setError("Maximal 8 Bilder – überzählige wurden ignoriert.");
    setFiles((prev) => [...prev, ...compressed].slice(0, 8));
  }

  async function extract() {
    setError(null);
    const body = new FormData();
    if (mode === "link") {
      if (!url.trim()) return setError("Bitte füge den Link zum Inserat ein.");
      body.set("url", url.trim());
    } else {
      if (!files.length) return setError("Bitte lade mindestens ein Bild hoch.");
      if (tooBig(files)) return setError(TOO_BIG);
      files.forEach((f) => body.append("images", f));
    }
    setBusy("extract");
    try {
      const res = await fetch("/api/extract", { method: "POST", body });
      const data = await readJson(res);
      if (!res.ok) {
        setError(data.error ?? "Auslesen fehlgeschlagen.");
        if (data.code === "BLOCKED" || data.code === "DISABLED") setMode("bilder");
        return;
      }
      const ex = data as unknown as Extraction & { seal: string | null };
      setSeal(ex.seal);
      setVehicle(ex.vehicle);
      setOrigin(mode);
      setUncertain(ex.uncertainties);
      // Genug erkannt? Dann direkt analysieren – korrigieren kann man im Ergebnis.
      if (ex.vehicle.make && ex.vehicle.model) return void (await analyze(ex.vehicle, mode, ex.seal));
      setStep("review");
      setBusy(null);
    } catch {
      setError("Keine Verbindung. Bitte prüfe deine Internetverbindung.");
      setBusy(null);
    }
  }

  async function analyze(v: Vehicle = vehicle, from: Mode = origin, s: string | null = seal) {
    setError(null);
    if (!v.make?.trim()) return setError("Bitte gib mindestens die Marke an.");
    const body = new FormData();
    body.set("vehicle", JSON.stringify(v));
    body.set("comps", JSON.stringify(comps));
    body.set("origin", from);
    if (s) body.set("seal", s);
    if (tooBig(files)) return setError(TOO_BIG);
    files.forEach((f) => body.append("images", f));
    setBusy("analyze");
    try {
      const res = await fetch("/api/analyze", { method: "POST", body });
      const data = await readJson(res);
      if (!res.ok) {
        setBusy(null);
        setStep("review");
        return setError(data.error ?? "Analyse fehlgeschlagen.");
      }
      saveAnalysis(data as AnalysisResult);
      router.push(`/analyse/${(data as AnalysisResult).id}`);
    } catch {
      setError("Keine Verbindung. Bitte prüfe deine Internetverbindung.");
      setBusy(null);
    }
  }

  if (busy) return <BusyCard kind={busy} />;

  if (step === "review")
    return (
      <div className="animate-rise space-y-5">
        <div className="rounded-2xl border bg-card p-5 sm:p-7">
          <div className="mb-5 flex items-start justify-between gap-4">
            <div>
                            <h2 className="mt-1 text-xl font-semibold tracking-tight">Fahrzeugdaten prüfen</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Kontrolliere die Angaben und ergänze, was du sicher weißt. Leere Felder bleiben leer – wir erfinden nichts.
              </p>
            </div>
          </div>
          {uncertain.length > 0 && (
            <div className="mb-5 flex gap-3 rounded-xl bg-warn-soft p-3 text-sm">
              <AlertTriangle className="mt-0.5 size-4 shrink-0 text-warn" />
              <div>
                <p className="font-medium">Bitte diese Punkte prüfen:</p>
                <ul className="mt-1 list-disc pl-4 text-muted-foreground">{uncertain.map((u) => <li key={u}>{u}</li>)}</ul>
              </div>
            </div>
          )}
          <VehicleForm value={vehicle} onChange={setVehicle} />
        </div>

        <div className="rounded-2xl border bg-card p-5 sm:p-7">
          <h3 className="font-semibold tracking-tight">Vergleichspreise <span className="font-normal text-muted-foreground">(optional, empfohlen)</span></h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Für eine seriöse Preisbewertung brauchen wir echte Vergleichsangebote. Suche auf mobile.de oder AutoScout24 nach gleichem Modell
            (±1 Jahr, ±20.000 km) und trage mindestens 3 Preise ein. Ohne Vergleichsdaten schätzen wir keinen Marktwert.
          </p>
          <CompsInput value={comps} onChange={setComps} />
        </div>

        {files.length > 0 && (
          <p className="flex items-center gap-2 px-1 text-sm text-muted-foreground">
            <Info className="size-4" /> {files.length} Bild{files.length > 1 ? "er" : ""} werden für die Sichtprüfung des Inserats verwendet.
          </p>
        )}
        {error && <ErrorNote text={error} />}
        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-between">
          <Button variant="ghost" size="lg" className="h-11" onClick={() => setStep("input")}>
            <ArrowLeft /> Zurück
          </Button>
          <Button size="lg" className="h-12 px-6 text-base" onClick={() => analyze()}>
            Analyse starten <ArrowRight />
          </Button>
        </div>
      </div>
    );

  const needsAi = mode !== "manuell" && !aiEnabled;
  return (
    <div className="bg-card p-2">
      <div role="group" aria-label="Eingabeart" className="grid grid-cols-3 gap-1 bg-muted p-1">
        {MODES.map((m) => (
          <button
            key={m.id}
            type="button"
            aria-pressed={mode === m.id}
            onClick={() => (setMode(m.id), setError(null))}
            className="flex min-h-11 items-center justify-center gap-2 rounded-lg px-2 text-sm font-medium text-foreground/75 transition-colors hover:text-foreground aria-pressed:bg-card aria-pressed:text-foreground"
          >
            <m.icon className="hidden size-4 shrink-0 sm:block" />
            <span className="truncate">{m.label}</span>
          </button>
        ))}
      </div>

      <div className="p-4 sm:p-6">
        {mode === "link" && (
          <form onSubmit={(e) => (e.preventDefault(), extract())} className="space-y-3">
            <label htmlFor="url" className="text-sm font-medium">Link zum Inserat</label>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Input
                id="url"
                type="url"
                inputMode="url"
                autoComplete="off"
                placeholder="https://www.autoscout24.de/angebote/…"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                className="h-12 text-base"
              />
              <Button type="submit" size="lg" className="h-12 px-6 text-base" disabled={needsAi || !linkEnabled}>
                Prüfen <ArrowRight />
              </Button>
            </div>
            <p>
              AutoScout24 und Kleinanzeigen direkt per Link. Für mobile.de bitte 1–3 Screenshots hochladen – das funktioniert mit jedem Portal.
            </p>
            {!linkEnabled && <ErrorNote tone="info" text="Der Link-Import ist auf diesem Server deaktiviert. Bitte nutze Screenshots des Inserats." />}
          </form>
        )}

        {mode === "bilder" && (
          <div className="space-y-4">
            <label
              htmlFor="files"
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => (e.preventDefault(), addFiles(e.dataTransfer.files))}
              className="flex cursor-pointer flex-col items-center justify-center gap-2 bg-paper px-4 py-8 text-center transition-colors hover:bg-paper/70 focus-within:ring-3 focus-within:ring-ring/50"
            >
              <ImagePlus className="size-7 text-brand" />
              <span className="font-medium">Screenshots oder Fotos auswählen</span>
              <span>Inserat (Daten & Beschreibung) plus Fahrzeugfotos · bis zu 8 Bilder</span>
              <input id="files" type="file" accept="image/jpeg,image/png,image/webp" multiple className="sr-only" onChange={(e) => (addFiles(e.target.files), (e.target.value = ""))} />
            </label>
            {files.length > 0 && <Thumbs files={files} onRemove={(i) => setFiles(files.filter((_, n) => n !== i))} />}
            <Button size="lg" className="h-12 w-full text-base" onClick={extract} disabled={needsAi || !files.length}>
              Inserat auslesen <ArrowRight />
            </Button>
          </div>
        )}

        {mode === "manuell" && (
          <div className="space-y-3">
            <p>
              Gib die Fahrzeugdaten selbst ein. Die Analyse mit Wissensdatenbank, Checklisten und Verhandlungshilfe funktioniert auch ohne KI-Auslesen.
            </p>
            <Button size="lg" className="h-12 w-full text-base" onClick={() => (setVehicle(EMPTY_VEHICLE), setUncertain([]), setOrigin("manuell"), setSeal(null), setStep("review"))}>
              Daten eingeben <ArrowRight />
            </Button>
          </div>
        )}

        {needsAi && (
          <div className="mt-4">
            <ErrorNote tone="info" text="Automatisches Auslesen ist nicht konfiguriert (fehlender KI-Schlüssel). Nutze die manuelle Eingabe." />
          </div>
        )}
        {error && <div className="mt-4"><ErrorNote text={error} /></div>}
      </div>
    </div>
  );
}

function Thumbs({ files, onRemove }: { files: File[]; onRemove: (i: number) => void }) {
  const urls = useMemo(() => files.map((f) => URL.createObjectURL(f)), [files]);
  useEffect(() => () => urls.forEach(URL.revokeObjectURL), [urls]);
  return (
    <ul className="grid grid-cols-4 gap-2 sm:grid-cols-8">
      {urls.map((u, i) => (
        <li key={u} className="group relative aspect-square overflow-hidden rounded-lg border bg-muted">
          {/* eslint-disable-next-line @next/next/no-img-element -- lokale Blob-URL */}
          <img src={u} alt={`Bild ${i + 1}`} className="size-full object-cover" />
          <span className="absolute bottom-1 left-1 rounded bg-black/60 px-1 text-[10px] text-white tabular">{i + 1}</span>
          <button onClick={() => onRemove(i)} aria-label={`Bild ${i + 1} entfernen`} className="absolute right-1 top-1 grid size-6 place-items-center rounded-full bg-black/60 text-white">
            <X className="size-3.5" />
          </button>
        </li>
      ))}
    </ul>
  );
}

const TOO_BIG = "Die Bilder sind zusammen zu groß. Bitte entferne ein oder zwei Bilder – 2–4 Screenshots reichen meist.";
const tooBig = (files: File[]) => files.reduce((sum, f) => sum + f.size, 0) > MAX_UPLOAD_BYTES;

/** Antwort lesen – auch wenn Vercel statt JSON eine Fehlerseite schickt (z. B. 413 bei zu großen Uploads). */
export async function readJson(res: Response): Promise<{ error?: string; code?: string } & Record<string, unknown>> {
  try {
    return await res.json();
  } catch {
    return { error: res.status === 413 ? TOO_BIG : `Der Server hat nicht geantwortet (Fehler ${res.status}). Bitte versuche es gleich noch einmal.` };
  }
}

export function ErrorNote({ text, tone = "error" }: { text: string; tone?: "error" | "info" }) {
  return (
    <div role={tone === "error" ? "alert" : "status"} className={`flex gap-2.5 rounded-xl p-3 text-sm ${tone === "error" ? "bg-bad-soft text-foreground" : "bg-accent text-accent-foreground"}`}>
      {tone === "error" ? <AlertTriangle className="mt-0.5 size-4 shrink-0 text-bad" /> : <Info className="mt-0.5 size-4 shrink-0" />}
      <span>{text}</span>
    </div>
  );
}

const STEPS = {
  extract: ["Inserat wird gelesen", "Fahrzeugdaten werden erkannt", "Angaben werden geprüft"],
  analyze: ["Motor und Getriebe werden zugeordnet", "Schwachstellen werden bewertet", "Inserat wird auf Auffälligkeiten geprüft", "Checkliste und Verhandlung werden erstellt"],
};

function BusyCard({ kind }: { kind: "extract" | "analyze" }) {
  const [i, setI] = useState(0);
  const steps = STEPS[kind];
  useEffect(() => {
    const t = setInterval(() => setI((n) => Math.min(n + 1, steps.length - 1)), 4500);
    return () => clearInterval(t);
  }, [steps.length]);
  return (
    <div className="animate-rise rounded-2xl border bg-card p-6 sm:p-8" aria-live="polite">
      <div className="flex items-center gap-3">
        <Loader2 className="size-5 animate-spin text-brand" />
        <p className="font-semibold">{kind === "extract" ? "Inserat wird ausgelesen" : "Analyse läuft"}</p>
      </div>
      <ol className="mt-5 space-y-3">
        {steps.map((s, n) => (
          <li key={s} className={`flex items-center gap-3 text-sm transition-opacity ${n <= i ? "opacity-100" : "opacity-35"}`}>
            <span className={`size-2 rounded-full ${n < i ? "bg-ok" : n === i ? "animate-pulse bg-brand" : "bg-border"}`} />
            {s}
          </li>
        ))}
      </ol>
      <p className="mt-6 text-xs text-muted-foreground">Das dauert meist 20–60 Sekunden.</p>
    </div>
  );
}
