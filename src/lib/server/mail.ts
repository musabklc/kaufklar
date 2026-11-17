import "server-only";
import { SITE_URL } from "../site";

export const mailEnabled = () => Boolean(process.env.RESEND_API_KEY);

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

/** Einfache Benachrichtigung im Tachoklar-Stil: Überschrift, ein Absatz, ein Knopf. Texte werden maskiert. */
export async function sendMail(to: string, subject: string, text: string, button: { label: string; href: string }, footer: string): Promise<boolean> {
  if (!mailEnabled()) {
    console.info("mail: RESEND_API_KEY fehlt, nicht gesendet:", subject);
    return false;
  }
  const href = button.href.startsWith("/") ? `${SITE_URL}${button.href}` : button.href;
  const html = `<div style="font-family:Arial,Helvetica,sans-serif;max-width:480px;margin:0 auto;padding:24px;color:#0b0c0e">
<p style="font-size:20px;font-weight:bold;margin:0 0 16px">Tachoklar</p>
<p style="font-size:16px;line-height:1.5">${esc(text)}</p>
<p style="margin:24px 0"><a href="${esc(href)}" style="background:#1f2de6;color:#fff;padding:12px 22px;border-radius:999px;text-decoration:none;display:inline-block">${esc(button.label)}</a></p>
<p style="font-size:13px;color:#555">${esc(footer)}</p>
<p style="font-size:13px;color:#555">Tachoklar · <a href="${SITE_URL}/impressum" style="color:#555">Impressum</a> · <a href="${SITE_URL}/datenschutz" style="color:#555">Datenschutz</a></p>
</div>`;
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { authorization: `Bearer ${process.env.RESEND_API_KEY}`, "content-type": "application/json" },
      body: JSON.stringify({ from: "Tachoklar <noreply@tachoklar.de>", to: [to], subject, html, text: `${text}\n\n${button.label}: ${href}\n\n${footer}` }),
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) console.warn("mail: Resend", res.status, (await res.text()).slice(0, 200));
    return res.ok;
  } catch (e) {
    console.warn("mail: nicht erreichbar", (e as Error).message);
    return false;
  }
}
