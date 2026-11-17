"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { Bell, BellOff, Bookmark, BookmarkCheck, Loader2 } from "lucide-react";
import { removeSaved, saveToAccount, savedState, setWatch, type SavedState } from "@/app/analysen/actions";
import type { AnalysisResult } from "@/lib/types";

/** Im Konto merken (alle Geräte) und optional Preisalarm per E-Mail. */
export function WatchButton({ r }: { r: AnalysisResult }) {
  const [state, setState] = useState<SavedState | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const hasLink = Boolean(r.vehicle.listingUrl);

  useEffect(() => {
    savedState(r.id).then(setState).catch(() => setState({ loggedIn: false, saved: false, watch: false }));
  }, [r.id]);

  if (!state) return null;
  if (!state.loggedIn)
    return (
      <Link href="/konto" className="inline-flex min-h-11 items-center gap-2 rounded-full border border-input bg-card px-4 text-sm font-medium hover:bg-muted">
        <Bookmark className="size-4" /> Anmelden zum Merken
      </Link>
    );

  const run = (fn: () => Promise<SavedState>) =>
    start(async () => {
      setMessage(null);
      try {
        setState(await fn());
      } catch {
        setMessage("Das hat nicht geklappt.");
      }
    });

  const save = (watch: boolean) =>
    run(async () => {
      const res = await saveToAccount(JSON.stringify(r), watch);
      if (!res.ok) throw new Error(res.message);
      return { loggedIn: true, saved: true, watch: watch && hasLink };
    });

  const btn = "inline-flex min-h-11 items-center gap-2 rounded-full border border-input bg-card px-4 text-sm font-medium hover:bg-muted disabled:opacity-60";
  return (
    <div className="no-print flex flex-wrap items-center gap-2">
      {!state.saved ? (
        <button type="button" className={btn} disabled={pending} onClick={() => save(hasLink)}>
          {pending ? <Loader2 className="size-4 animate-spin" /> : <Bookmark className="size-4" />}
          Merken{hasLink ? " + Preisalarm" : ""}
        </button>
      ) : (
        <>
          <button type="button" className={btn} disabled={pending} onClick={() => run(async () => ((await removeSaved(r.id)) ? { loggedIn: true, saved: false, watch: false } : state))}>
            <BookmarkCheck className="size-4 text-brand" /> Gemerkt
          </button>
          {hasLink && (
            <button
              type="button"
              className={btn}
              disabled={pending}
              aria-pressed={state.watch}
              onClick={() => run(async () => ((await setWatch(r.id, !state.watch)) ? { ...state, watch: !state.watch } : state))}
            >
              {state.watch ? <Bell className="size-4 text-brand" /> : <BellOff className="size-4" />}
              {state.watch ? "Preisalarm an" : "Preisalarm aus"}
            </button>
          )}
        </>
      )}
      {message && <p role="alert" className="text-sm text-bad">{message}</p>}
    </div>
  );
}
