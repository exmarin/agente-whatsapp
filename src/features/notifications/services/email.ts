import "server-only";

const RESEND_URL = "https://api.resend.com/emails";

/**
 * Resend's sandbox sender — works with no domain verification, good enough
 * until a workspace wants a branded "from" address. One global account for
 * the whole deployment (RESEND_API_KEY), not per-workspace — same pattern
 * as META_APP_SECRET.
 */
const FROM_ADDRESS = "Agente WhatsApp <onboarding@resend.dev>";

export async function sendNotificationEmail(args: { to: string[]; subject: string; text: string }): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey || args.to.length === 0) return;

  const res = await fetch(RESEND_URL, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: FROM_ADDRESS,
      to: args.to,
      subject: args.subject,
      text: args.text,
    }),
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(`Resend error (${res.status}): ${data.message ?? res.statusText}`);
  }
}
