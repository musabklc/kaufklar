import "server-only";
import Stripe from "stripe";
import { serviceDb } from "./forum-admin";
import { PREMIUM_PRICE_CENTS } from "../analysis/premium";

/** Bezahlschranke erst aktiv, wenn ausdrücklich eingeschaltet (Gewerbe, AGB, Widerrufsbelehrung müssen vorher stehen). */
export const premiumEnabled = () => process.env.PREMIUM_ENABLED === "true" && Boolean(process.env.STRIPE_SECRET_KEY);

let client: Stripe | null = null;
const stripe = () => (client ??= new Stripe(process.env.STRIPE_SECRET_KEY!));

export async function createCheckout(o: { analysisId: string; title: string; userId: string | null; origin: string }): Promise<string> {
  const amount = PREMIUM_PRICE_CENTS;
  const session = await stripe().checkout.sessions.create({
    mode: "payment",
    line_items: [{ quantity: 1, price_data: { currency: "eur", unit_amount: amount, product_data: { name: "Tachoklar Premium-Bericht", description: o.title.slice(0, 200) } } }],
    client_reference_id: o.analysisId,
    metadata: { analysis_id: o.analysisId },
    payment_intent_data: { metadata: { analysis_id: o.analysisId } },
    locale: "de",
    success_url: `${o.origin}/analyse/${o.analysisId}?bezahlt={CHECKOUT_SESSION_ID}`,
    cancel_url: `${o.origin}/analyse/${o.analysisId}`,
    integration_identifier: "tachoklar_premium_qkzrtmwa",
  });
  const { error } = await serviceDb()!.from("payments").insert({
    session_id: session.id,
    analysis_id: o.analysisId,
    user_id: o.userId,
    amount_cents: amount,
    consent_at: new Date().toISOString(),
  });
  if (error) throw new Error(`payment insert failed: ${error.message}`);
  return session.url!;
}

/**
 * Freischalten – aus dem Webhook und aus der Erfolgsseite, beliebig oft aufrufbar.
 * Gegen Manipulation zählt nur, was wir selbst beim Anlegen gespeichert haben (Analyse, Betrag) und was Stripe bestätigt.
 */
export async function fulfill(s: Stripe.Checkout.Session): Promise<boolean> {
  if (s.payment_status !== "paid" && s.payment_status !== "no_payment_required") return false;
  const db = serviceDb()!;
  const { data: p } = await db.from("payments").select("analysis_id, amount_cents, status").eq("session_id", s.id).maybeSingle();
  if (!p?.analysis_id) return false;
  if (s.metadata?.analysis_id !== p.analysis_id || s.amount_total !== p.amount_cents || s.currency !== "eur") {
    console.error("stripe: Session passt nicht zur gespeicherten Zahlung", s.id);
    return false;
  }
  if (p.status !== "bezahlt")
    await db
      .from("payments")
      .update({ status: "bezahlt", paid_at: new Date().toISOString(), payment_intent: typeof s.payment_intent === "string" ? s.payment_intent : (s.payment_intent?.id ?? null) })
      .eq("session_id", s.id);
  await db.from("analyses").update({ premium_at: new Date().toISOString() }).eq("id", p.analysis_id).is("premium_at", null);
  return true;
}

/** Erfolgsseite: Zahlung direkt bei Stripe nachfragen, falls der Webhook noch nicht da war. */
export async function confirmSession(sessionId: string): Promise<boolean> {
  if (!/^cs_[A-Za-z0-9_]+$/.test(sessionId)) return false;
  try {
    return await fulfill(await stripe().checkout.sessions.retrieve(sessionId));
  } catch (e) {
    console.error("stripe confirm failed", (e as Error).message);
    return false;
  }
}

export async function markFailed(sessionId: string) {
  await serviceDb()?.from("payments").update({ status: "fehlgeschlagen" }).eq("session_id", sessionId).eq("status", "offen");
}

/** Webhook: Signatur prüfen und jedes Ereignis nur einmal verarbeiten. */
export async function handleWebhook(body: string, signature: string | null): Promise<{ status: number; text: string }> {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret || !signature) return { status: 400, text: "missing signature" };
  let event: Stripe.Event;
  try {
    event = stripe().webhooks.constructEvent(body, signature, secret);
  } catch {
    return { status: 400, text: "invalid signature" };
  }
  const db = serviceDb()!;
  const { error: dup } = await db.from("stripe_events").insert({ id: event.id, type: event.type });
  if (dup) return dup.code === "23505" ? { status: 200, text: "already processed" } : { status: 500, text: "db error" };
  try {
    if (event.type === "checkout.session.completed" || event.type === "checkout.session.async_payment_succeeded") await fulfill(event.data.object);
    else if (event.type === "checkout.session.async_payment_failed" || event.type === "checkout.session.expired") await markFailed(event.data.object.id);
  } catch (e) {
    // Ereignis wieder freigeben, damit Stripes erneute Zustellung es nachholt
    await db.from("stripe_events").delete().eq("id", event.id);
    console.error("stripe webhook failed", (e as Error).message);
    return { status: 500, text: "processing failed" };
  }
  return { status: 200, text: "ok" };
}
