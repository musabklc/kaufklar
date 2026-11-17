import "server-only";
import { createClient } from "@supabase/supabase-js";
import { checkListing } from "./link";
import { sendMail } from "./mail";
import { watchEvent } from "../analysis/watch";

const db = () =>
  process.env.SUPABASE_URL && process.env.SUPABASE_SECRET_KEY
    ? createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SECRET_KEY, { auth: { persistSession: false } })
    : null;

const eur = (n: number) => `${n.toLocaleString("de-DE")} €`;
const FOOTER = "Du bekommst diese E-Mail, weil du für dieses Auto bei Tachoklar den Preisalarm eingeschaltet hast. Ausschalten: unter „Meine Analysen“ auf die Glocke tippen.";

/** Täglicher Preisalarm: die am längsten nicht geprüften gemerkten Inserate öffnen, bei Preissenkung oder Löschung mailen. */
export async function runWatch(limit = 20) {
  const sb = db();
  if (!sb) return { checked: 0, mails: 0 };
  const { data: rows } = await sb
    .from("saved_analyses")
    .select("id, user_id, title, listing_url, price_eur, last_price")
    .eq("watch", true)
    .is("gone_at", null)
    .not("listing_url", "is", null)
    .order("last_checked_at", { ascending: true, nullsFirst: true })
    .limit(limit);
  let checked = 0;
  let mails = 0;
  // Je 5 gleichzeitig, damit 20 Prüfungen in die 60 s passen
  for (let i = 0; i < (rows ?? []).length; i += 5) {
    await Promise.all(
      rows!.slice(i, i + 5).map(async (r) => {
        const check = await checkListing(r.listing_url!);
        const now = new Date().toISOString();
        if (!check) return void (await sb.from("saved_analyses").update({ last_checked_at: now }).eq("id", r.id));
        checked++;
        const event = watchEvent(r.last_price ?? r.price_eur, check);
        await sb
          .from("saved_analyses")
          .update({ last_checked_at: now, ...(check.gone ? { gone_at: now } : {}), ...(check.price !== null ? { last_price: check.price } : {}) })
          .eq("id", r.id);
        if (!event) return;
        const { data: u } = await sb.auth.admin.getUserById(r.user_id);
        const to = u?.user?.email;
        if (!to) return;
        const ok =
          event.kind === "weg"
            ? await sendMail(to, `Nicht mehr online: ${r.title}`, `Das Inserat für den ${r.title}, den du dir gemerkt hast, ist nicht mehr online – vermutlich verkauft. Deine Analyse bleibt gespeichert.`, { label: "Ähnliche Autos prüfen", href: "/#pruefen" }, FOOTER)
            : await sendMail(to, `Preis gesenkt: ${r.title} jetzt ${eur(event.to)}`, `Der ${r.title}, den du dir gemerkt hast, kostet jetzt ${eur(event.to)} statt ${eur(event.from)} (−${eur(event.from - event.to)}).`, { label: "Analyse ansehen", href: `/analyse/${r.id}` }, FOOTER);
        if (ok) mails++;
      }),
    );
  }
  return { checked, mails };
}
