import { handleWebhook } from "@/lib/server/payments";

/** Stripe-Webhook: Freischaltung nach bestätigter Zahlung. Rohtext nötig für die Signaturprüfung. */
export async function POST(req: Request) {
  const { status, text } = await handleWebhook(await req.text(), req.headers.get("stripe-signature"));
  return new Response(text, { status });
}
