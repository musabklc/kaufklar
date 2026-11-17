import { AlertTriangle, CheckCircle2, HelpCircle, XCircle } from "lucide-react";
import type { AnalysisResult } from "@/lib/types";

const eur = (n: number) => `${n.toLocaleString("de-DE")} €`;
const VERDICT = {
  ok: { icon: CheckCircle2, cls: "text-ok", label: "in Ordnung" },
  "auffällig": { icon: AlertTriangle, cls: "text-warn", label: "auffällig" },
  kritisch: { icon: XCircle, cls: "text-bad", label: "kritisch" },
  "nicht beurteilbar": { icon: HelpCircle, cls: "text-muted-foreground", label: "nicht beurteilbar" },
} as const;
const LEVEL = { ok: VERDICT.ok, warn: VERDICT["auffällig"], bad: VERDICT.kritisch } as const;

/** Ergebnis der Foto-Bewertung vor Ort. */
export function InspectionResult({ i }: { i: NonNullable<AnalysisResult["inspection"]> }) {
  return (
    <div>
      <p className="text-sm text-muted-foreground">KI-Einschätzung vom {new Date(i.at).toLocaleString("de-DE")}</p>
      <p className="mt-2 text-lg">{i.summary}</p>
      {i.negotiationEur ? <p className="mt-3 rounded-2xl bg-warn-soft p-4 font-medium">Verhandlungsspielraum wegen der Befunde: ca. −{eur(i.negotiationEur)}</p> : null}
      <ul className="mt-4 space-y-3">
        {i.items.map((it, n) => {
          const v = VERDICT[it.verdict];
          return (
            <li key={n} className="flex gap-3 rounded-2xl bg-muted/60 p-4">
              <v.icon className={`mt-0.5 size-5 shrink-0 ${v.cls}`} />
              <div>
                <p className="font-medium">{it.area} <span className={`text-sm font-normal ${v.cls}`}>· {v.label}</span></p>
                <p className="mt-1">{it.finding}</p>
                {it.costMinEur && it.costMaxEur ? <p className="mt-1 text-sm text-muted-foreground">Kosten ca. {eur(it.costMinEur)}–{eur(it.costMaxEur)}</p> : null}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/** Abgelesenes Scheckheft mit gerechneter Plausibilitätsprüfung. */
export function ServiceBookResult({ b }: { b: NonNullable<AnalysisResult["serviceBook"]> }) {
  return (
    <div>
      <ul className="space-y-2">
        {b.checks.map((c, n) => {
          const v = LEVEL[c.level];
          return (
            <li key={n} className="flex gap-3 rounded-2xl bg-muted/60 p-4">
              <v.icon className={`mt-0.5 size-5 shrink-0 ${v.cls}`} /> <span>{c.text}</span>
            </li>
          );
        })}
      </ul>
      {b.remarks && <p className="mt-3 flex gap-2 text-sm"><AlertTriangle className="mt-0.5 size-4 shrink-0 text-warn" /> {b.remarks}</p>}
      {b.entries.length > 0 && (
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="text-muted-foreground"><tr><th className="py-2 pr-4 font-medium">Datum</th><th className="py-2 pr-4 font-medium">km</th><th className="py-2 pr-4 font-medium">Arbeit</th><th className="py-2 font-medium">Werkstatt</th></tr></thead>
            <tbody>
              {b.entries.map((e, n) => (
                <tr key={n} className="border-t">
                  <td className="py-2 pr-4 tabular-nums">{e.date}</td>
                  <td className="py-2 pr-4 tabular-nums">{e.km !== null ? e.km.toLocaleString("de-DE") : "–"}</td>
                  <td className="py-2 pr-4">{e.work}</td>
                  <td className="py-2">{e.workshop ?? "–"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <p className="mt-3 text-sm text-muted-foreground">Lesbarkeit: {b.readability}. Abgelesen von einer KI, geprüft von Tachoklar. Originale immer selbst ansehen.</p>
    </div>
  );
}
