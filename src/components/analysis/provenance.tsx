import type { Provenance } from "@/lib/types";

const P: Record<Provenance, { label: string; desc: string; cls: string }> = {
  gesichert: { label: "Gesichert", desc: "steht so im Inserat", cls: "bg-ok-soft text-ok" },
  modelltypisch: { label: "Modelltypisch", desc: "bekannte Schwachstelle laut Datenbank", cls: "bg-paper text-foreground" },
  nutzer: { label: "Von Nutzern gemeldet", desc: "von mehreren Kaufklar-Nutzern unabhängig gemeldet", cls: "bg-ok-soft text-foreground" },
  ki: { label: "KI-Einschätzung", desc: "Vermutung der KI, nicht verifiziert", cls: "bg-secondary text-foreground" },
  pruefen: { label: "Zu prüfen", desc: "muss vor Ort geklärt werden", cls: "bg-warn-soft text-warn" },
};

export function ProvenanceBadge({ p }: { p: Provenance }) {
  return <span className={`inline-flex shrink-0 items-center px-1.5 py-0.5 text-xs font-semibold ${P[p].cls}`}>{P[p].label}</span>;
}

export function ProvenanceLegend() {
  return (
    <ul className="grid gap-3 sm:grid-cols-2">
      {(Object.keys(P) as Provenance[]).map((k) => (
        <li key={k} className="flex items-center gap-3 text-sm">
          <ProvenanceBadge p={k} />
          <span>{P[k].desc}</span>
        </li>
      ))}
    </ul>
  );
}
