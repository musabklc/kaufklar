"use client";

import { useActionState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

type State = { ok?: boolean; message?: string };

/** Formular für eine Server Action: Lade-Zustand, Meldung darunter, nach Erfolg optional ausblenden. */
export function ActionForm({
  action,
  submit,
  children,
  hideOnSuccess = false,
  className = "space-y-4",
  variant = "default",
}: {
  action: (s: State, f: FormData) => Promise<State>;
  submit: string;
  children: React.ReactNode;
  hideOnSuccess?: boolean;
  className?: string;
  variant?: "default" | "outline" | "destructive";
}) {
  const [state, run, pending] = useActionState(action, {});
  if (hideOnSuccess && state.ok) return <p role="status" className="rounded-2xl bg-ok-soft p-4">{state.message}</p>;
  return (
    <form action={run} className={className}>
      {children}
      {/* Spamfalle: für Menschen unsichtbar */}
      <input type="text" name="website" tabIndex={-1} autoComplete="off" aria-hidden="true" className="absolute -left-[9999px] h-0 w-0" />
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <Button type="submit" size="lg" variant={variant} className="h-11 px-6 text-base" disabled={pending}>
          {pending && <Loader2 className="animate-spin" />} {submit}
        </Button>
        {state.message && (
          <p role={state.ok ? "status" : "alert"} className={state.ok ? "text-ok" : "text-bad"}>
            {state.message}
          </p>
        )}
      </div>
    </form>
  );
}

export const labelCls = "flex flex-col gap-1.5 text-sm font-medium";
