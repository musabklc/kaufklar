export type GarageDue = { hu_due: string | null; service_due: string | null; belt_due: string | null; reminded: Record<string, string> };
export type Reminder = { key: "hu" | "service" | "belt"; label: string; date: string; overdue: boolean };

const RULES = [
  { key: "hu", field: "hu_due", label: "HU/TÜV", days: 30 },
  { key: "service", field: "service_due", label: "Inspektion/Ölwechsel", days: 14 },
  { key: "belt", field: "belt_due", label: "Zahnriemen-Wechsel", days: 30 },
] as const;

/** Welche Termine sind bald fällig (oder überfällig) und wurden für genau dieses Datum noch nicht erinnert? */
export function dueReminders(car: GarageDue, today: Date): Reminder[] {
  const out: Reminder[] = [];
  for (const r of RULES) {
    const date = car[r.field];
    if (!date || car.reminded[r.key] === date) continue;
    const days = (new Date(`${date}T00:00:00Z`).getTime() - Date.UTC(today.getFullYear(), today.getMonth(), today.getDate())) / 864e5;
    if (days <= r.days) out.push({ key: r.key, label: r.label, date, overdue: days < 0 });
  }
  return out;
}

/** "05/2027" (wie im Fahrzeugschein) oder "2027-05-12" → ISO-Datum; Monat ohne Tag = Monatsende. */
export function parseDue(s: string | null | undefined): string | null {
  const t = (s ?? "").trim();
  if (!t) return null;
  let m = t.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (m) return t;
  m = t.match(/^(\d{1,2})[./](\d{4})$/);
  if (m && +m[1] >= 1 && +m[1] <= 12) {
    const last = new Date(Date.UTC(+m[2], +m[1], 0)).getUTCDate();
    return `${m[2]}-${m[1].padStart(2, "0")}-${String(last).padStart(2, "0")}`;
  }
  m = t.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/);
  if (m) return `${m[3]}-${m[2].padStart(2, "0")}-${m[1].padStart(2, "0")}`;
  return null;
}
