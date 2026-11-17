"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Bell, Trash2 } from "lucide-react";
import { listSaved, removeSaved, setWatch, type SavedItem } from "./actions";

const eur = (n: number) => `${n.toLocaleString("de-DE")} €`;

/** Im Konto gemerkte Autos (alle Geräte) mit Preisalarm-Status. */
export function SavedInAccount() {
  const [list, setList] = useState<SavedItem[] | null | undefined>(undefined);
  const load = () => listSaved().then(setList).catch(() => setList(null));
  useEffect(() => void load(), []);

  if (list === undefined) return null;
  if (list === null)
    return (
      <p className="mt-6 rounded-3xl bg-card p-5">
        <Link href="/konto?weiter=%2Fanalysen" className="font-medium text-brand underline">Melde dich an</Link>, um Autos zu merken: Sie sind dann auf jedem Gerät da, und
        wir schicken dir eine E-Mail, wenn der Preis sinkt oder das Inserat verschwindet.
      </p>
    );
  return (
    <section className="mt-8">
      <h2 className="text-xl font-semibold">Gemerkt im Konto</h2>
      {list.length === 0 ? (
        <p className="mt-2 text-muted-foreground">Noch nichts gemerkt. In jeder Analyse gibt es oben „Merken“.</p>
      ) : (
        <ul className="mt-4 space-y-3">
          {list.map((a) => {
            const dropped = a.lastPrice !== null && a.priceEur !== null && a.lastPrice < a.priceEur;
            return (
              <li key={a.id} className="flex items-center gap-3 rounded-3xl bg-card p-4">
                <Link href={`/analyse/${a.id}`} className="min-w-0 flex-1">
                  <p className="truncate font-medium">{a.title}</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {a.gone ? (
                      <span className="text-bad">Inserat nicht mehr online</span>
                    ) : dropped ? (
                      <span className="text-ok">Preis gesenkt: {eur(a.priceEur!)} → {eur(a.lastPrice!)}</span>
                    ) : a.priceEur ? (
                      eur(a.priceEur)
                    ) : (
                      "ohne Preis"
                    )}
                    {" · "}gemerkt am {new Date(a.createdAt).toLocaleDateString("de-DE")}
                  </p>
                </Link>
                {a.hasLink && !a.gone && (
                  <button
                    type="button"
                    aria-pressed={a.watch}
                    aria-label={a.watch ? "Preisalarm ausschalten" : "Preisalarm einschalten"}
                    title={a.watch ? "Preisalarm an" : "Preisalarm aus"}
                    className={`inline-flex size-11 items-center justify-center rounded-full hover:bg-muted ${a.watch ? "text-brand" : "text-muted-foreground"}`}
                    onClick={async () => (await setWatch(a.id, !a.watch)) && load()}
                  >
                    <Bell className="size-5" />
                  </button>
                )}
                <button
                  type="button"
                  aria-label="Aus dem Konto entfernen"
                  className="inline-flex size-11 items-center justify-center rounded-full text-muted-foreground hover:bg-muted"
                  onClick={async () => confirm("Aus dem Konto entfernen?") && (await removeSaved(a.id)) && load()}
                >
                  <Trash2 className="size-5" />
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
