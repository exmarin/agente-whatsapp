import "server-only";

const YCLOUD_BASE = "https://api.ycloud.com/v2";

export interface SendResult {
  wamid: string | null;
  status: string | null;
}

/**
 * Blueprint §5.A: canonical auth is `X-API-Key`. Production (Movinsa) has
 * also been seen accepting `Authorization: Bearer`; if a given account
 * rejects X-API-Key, switch this single spot, not every call site.
 */
export async function sendText(args: {
  from: string;
  to: string;
  body: string;
  apiKey: string;
}): Promise<SendResult> {
  const res = await fetch(`${YCLOUD_BASE}/whatsapp/messages`, {
    method: "POST",
    headers: { "X-API-Key": args.apiKey, "Content-Type": "application/json" },
    body: JSON.stringify({
      type: "text",
      from: args.from,
      to: args.to,
      text: { body: args.body },
    }),
  });

  const data = (await res.json()) as { wamid?: string; status?: string; message?: string };
  if (!res.ok) {
    throw new Error(`YCloud sendText failed (${res.status}): ${data.message ?? JSON.stringify(data)}`);
  }
  // Synchronous response is "accepted" — the real delivery status arrives
  // later via the whatsapp.message.updated webhook, correlated by wamid.
  return { wamid: data.wamid ?? null, status: data.status ?? null };
}
