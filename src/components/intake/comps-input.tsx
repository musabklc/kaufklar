"use client";

import { useState } from "react";
import { Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function CompsInput({ value, onChange }: { value: number[]; onChange: (v: number[]) => void }) {
  const [draft, setDraft] = useState("");
  const add = () => {
    const n = Number(draft.replace(/\D/g, ""));
    if (n >= 500 && value.length < 20) onChange([...value, n]);
    setDraft("");
  };
  return (
    <div className="mt-4 space-y-3">
      <form onSubmit={(e) => (e.preventDefault(), add())} className="flex gap-2">
        <Input
          inputMode="numeric"
          aria-label="Vergleichspreis in Euro"
          placeholder="Preis eines Vergleichsangebots, z. B. 13.500"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          className="h-11 text-base sm:text-sm"
        />
        <Button type="submit" variant="outline" size="lg" className="h-11 px-4" disabled={!draft}>
          <Plus /> Hinzufügen
        </Button>
      </form>
      {value.length > 0 && (
        <ul className="flex flex-wrap gap-2">
          {value.map((p, i) => (
            <li key={i} className="flex items-center gap-1 rounded-full border bg-muted/60 py-1 pl-3 pr-1 text-sm tabular">
              {p.toLocaleString("de-DE")} €
              <button onClick={() => onChange(value.filter((_, n) => n !== i))} aria-label="Entfernen" className="grid size-6 place-items-center rounded-full hover:bg-background">
                <X className="size-3.5" />
              </button>
            </li>
          ))}
        </ul>
      )}
      <p className="text-xs text-muted-foreground">
        {value.length < 3 ? `Noch ${3 - value.length} für eine Marktwertschätzung.` : `${value.length} Vergleichspreise – Marktwert wird geschätzt.`}
      </p>
    </div>
  );
}
