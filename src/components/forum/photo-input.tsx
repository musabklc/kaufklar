"use client";

import { useEffect, useRef, useState } from "react";
import { ImagePlus, X } from "lucide-react";
import { shrinkPhoto } from "@/lib/client-image";

const MAX = 3;

/** Bis zu 3 Fotos für einen Beitrag; landen als "photos" im Formular. */
export function PhotoInput() {
  const real = useRef<HTMLInputElement>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [error, setError] = useState<string | null>(null);
  const urls = files.map((f) => URL.createObjectURL(f));
  useEffect(() => () => urls.forEach(URL.revokeObjectURL), [urls]);

  function sync(list: File[]) {
    setFiles(list);
    const dt = new DataTransfer();
    list.forEach((f) => dt.items.add(f));
    if (real.current) real.current.files = dt.files;
  }

  async function add(e: React.ChangeEvent<HTMLInputElement>) {
    const picked = [...(e.target.files ?? [])];
    e.target.value = "";
    setError(null);
    const out = (await Promise.all(picked.slice(0, MAX - files.length).map((f) => shrinkPhoto(f)))).filter((f): f is File => f !== null);
    if (out.length < picked.length) setError(picked.length > MAX - files.length ? `Höchstens ${MAX} Fotos.` : "Ein Bild ließ sich nicht lesen.");
    sync([...files, ...out]);
  }

  return (
    <div>
      <input ref={real} type="file" name="photos" multiple className="hidden" tabIndex={-1} aria-hidden="true" />
      <div className="flex flex-wrap items-center gap-3">
        {urls.map((u, i) => (
          <div key={u} className="relative">
            {/* eslint-disable-next-line @next/next/no-img-element -- lokale Vorschau */}
            <img src={u} alt={`Foto ${i + 1}`} className="size-20 rounded-xl object-cover" />
            <button type="button" aria-label={`Foto ${i + 1} entfernen`} onClick={() => sync(files.filter((_, n) => n !== i))} className="absolute -top-2 -right-2 inline-flex size-7 items-center justify-center rounded-full bg-foreground text-background">
              <X className="size-4" />
            </button>
          </div>
        ))}
        {files.length < MAX && (
          <label className="inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-full border border-input bg-card px-4 text-sm font-medium hover:bg-muted">
            <ImagePlus className="size-4" /> Fotos hinzufügen
            <input type="file" accept="image/*" multiple onChange={add} className="sr-only" />
          </label>
        )}
      </div>
      <p className="mt-1 text-sm text-muted-foreground">{error ?? `Bis zu ${MAX} Fotos, z. B. vom Schaden. Keine Kennzeichen oder Personen.`}</p>
    </div>
  );
}
