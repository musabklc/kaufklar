"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import type { Level, Recommendation } from "@/lib/types";

export const fmt = (n: number) => `${n.toLocaleString("de-DE")} €`;
export const range = (a: number | null, b: number | null) => (a === null || b === null ? "keine Angabe" : a === b ? fmt(a) : `${fmt(a)} – ${fmt(b)}`);

const tone = (risk: number) => (risk < 35 ? "var(--ok)" : risk < 60 ? "var(--warn)" : "var(--bad)");

export function RiskGauge({ value }: { value: number }) {
  const r = 52;
  const len = Math.PI * r;
  return (
    <div className="relative mx-auto w-48">
      <svg viewBox="0 0 128 72" className="w-full" role="img" aria-label={`Gesamtrisiko ${value} von 100`}>
        <path d="M12 64 A52 52 0 0 1 116 64" fill="none" stroke="var(--muted)" strokeWidth="10" strokeLinecap="round" />
        <path
          d="M12 64 A52 52 0 0 1 116 64"
          fill="none"
          stroke={tone(value)}
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={len}
          strokeDashoffset={len * (1 - value / 100)}
          style={{ transition: "stroke-dashoffset 1s cubic-bezier(.2,.7,.2,1)" }}
        />
      </svg>
      <div className="absolute inset-x-0 bottom-0 text-center">
        <div className="text-4xl font-semibold tracking-tight tabular">{value}</div>
        <div className="text-xs text-muted-foreground">Gesamtrisiko von 100</div>
      </div>
    </div>
  );
}

export function ScoreBar({ label, value, invert = false, hint }: { label: string; value: number | null; invert?: boolean; hint: string }) {
  const good = value === null ? null : invert ? 10 - value : value;
  const color = good === null ? "var(--border)" : good >= 7 ? "var(--ok)" : good >= 4 ? "var(--warn)" : "var(--bad)";
  return (
    <div>
      <div className="flex items-baseline justify-between text-sm">
        <span className="font-medium">{label}</span>
        <span className="tabular text-muted-foreground">{value === null ? "nicht bewertbar" : <><b className="font-semibold text-foreground">{value}</b>/10</>}</span>
      </div>
      <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-muted">
        <div className="h-full rounded-full transition-[width] duration-700" style={{ width: `${(value ?? 0) * 10}%`, background: color }} />
      </div>
      <p className="mt-1 text-xs text-muted-foreground">{hint}</p>
    </div>
  );
}

export function LevelPill({ level, prefix = "Risiko" }: { level: Level; prefix?: string }) {
  const cls = { hoch: "bg-bad-soft text-bad", mittel: "bg-warn-soft text-warn", niedrig: "bg-muted text-muted-foreground" }[level];
  return <span className={`inline-flex shrink-0 items-center gap-1 px-1.5 py-0.5 text-xs font-semibold ${cls}`}>{prefix} {level}</span>;
}

export const VERDICT: Record<Recommendation["verdict"], { cls: string; dot: string }> = {
  Kaufenswert: { cls: "bg-ok-soft", dot: "bg-ok" },
  "Preisverhandlung empfohlen": { cls: "bg-ok-soft", dot: "bg-warn" },
  "Nur nach genauer Prüfung": { cls: "bg-warn-soft", dot: "bg-warn" },
  "Lieber Abstand nehmen": { cls: "bg-bad-soft", dot: "bg-bad" },
};

export function CopyButton({ text, label }: { text: string; label: string }) {
  const [done, setDone] = useState(false);
  return (
    <Button
      variant="outline"
      size="lg"
      className="h-10"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setDone(true);
          toast.success("In die Zwischenablage kopiert");
          setTimeout(() => setDone(false), 2000);
        } catch {
          toast.error("Kopieren nicht möglich – bitte Text manuell markieren.");
        }
      }}
    >
      {done ? <Check /> : <Copy />} {label}
    </Button>
  );
}

export function ProBadge() {
  return (
    <span title="Pro-Funktion – in der Startphase kostenlos" className="inline-flex items-center bg-primary px-1.5 py-0.5 text-xs font-semibold text-primary-foreground">
      Pro
    </span>
  );
}

export function Section({ id, title, eyebrow, action, pro, children }: { id: string; title: string; eyebrow?: string; action?: React.ReactNode; pro?: boolean; children: React.ReactNode }) {
  return (
    <section id={id} className="reveal bg-card p-5 sm:p-8">
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 text-2xl font-bold sm:text-3xl" data-eyebrow={eyebrow}>{title}{pro && <ProBadge />}</h2>
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}
