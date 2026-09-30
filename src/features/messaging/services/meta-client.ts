import "server-only";

const GRAPH_VERSION = process.env.META_GRAPH_API_VERSION || "v21.0";

export interface SendResult {
  wamid: string | null;
}

/** Meta's Cloud API wants digits only for `to` — no leading "+". */
function toGraphPhone(e164: string): string {
  return e164.replace(/[^\d]/g, "");
}

export async function sendText(args: {
  phoneNumberId: string;
  to: string;
  body: string;
  accessToken: string;
}): Promise<SendResult> {
  const res = await fetch(`https://graph.facebook.com/${GRAPH_VERSION}/${args.phoneNumberId}/messages`, {
    method: "POST",
    headers: { Authorization: `Bearer ${args.accessToken}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      to: toGraphPhone(args.to),
      type: "text",
      text: { body: args.body },
    }),
  });

  const data = (await res.json()) as {
    messages?: { id: string }[];
    error?: { message: string };
  };
  if (!res.ok) {
    throw new Error(`Meta sendText failed (${res.status}): ${data.error?.message ?? JSON.stringify(data)}`);
  }
  return { wamid: data.messages?.[0]?.id ?? null };
}
