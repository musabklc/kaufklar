import "server-only";
import { dueReminders } from "../analysis/garage";
import { serviceDb } from "./forum-admin";
import { sendMail } from "./mail";

const day = (iso: string) => new Date(`${iso}T00:00:00Z`).toLocaleDateString("de-DE", { timeZone: "UTC" });

/** Täglich: an bald fällige HU, Inspektion und Zahnriemen erinnern – je Termin genau eine Mail. */
export async function runGarage(limit = 200) {
  const db = serviceDb();
  if (!db) return { cars: 0, mails: 0 };
  const { data: cars } = await db.from("garage_cars").select("id, user_id, title, hu_due, service_due, belt_due, reminded").limit(limit);
  let mails = 0;
  const emails = new Map<string, string | null>();
  for (const c of cars ?? []) {
    const due = dueReminders({ ...c, reminded: (c.reminded ?? {}) as Record<string, string> }, new Date());
    if (!due.length) continue;
    if (!emails.has(c.user_id)) emails.set(c.user_id, (await db.auth.admin.getUserById(c.user_id)).data.user?.email ?? null);
    const to = emails.get(c.user_id);
    if (!to) continue;
    const lines = due.map((d) => `${d.label}: ${d.overdue ? "überfällig seit" : "fällig am"} ${day(d.date)}`).join(" · ");
    const ok = await sendMail(
      to,
      `Erinnerung für deinen ${c.title}: ${due.map((d) => d.label).join(", ")}`,
      `Für deinen ${c.title} steht etwas an – ${lines}. Rechtzeitig einen Termin zu machen spart Stress und oft Geld.`,
      { label: "Zur Garage", href: "/garage" },
      "Du bekommst diese E-Mail, weil du das Auto in deiner Tachoklar-Garage mit diesem Termin eingetragen hast. Termin löschen oder ändern beendet die Erinnerung.",
    );
    if (!ok) continue;
    mails++;
    const reminded = { ...((c.reminded ?? {}) as Record<string, string>), ...Object.fromEntries(due.map((d) => [d.key, d.date])) };
    await db.from("garage_cars").update({ reminded }).eq("id", c.id);
  }
  return { cars: cars?.length ?? 0, mails };
}
