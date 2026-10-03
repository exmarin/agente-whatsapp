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

/**
 * Webhook payloads only carry a media ID, never a link — this resolves it
 * to a short-lived (a few minutes) download URL. Still requires the Bearer
 * token to actually fetch the bytes from that URL.
 */
export async function resolveMediaUrl(
  mediaId: string,
  accessToken: string,
): Promise<{ url: string; mimeType: string; fileSize: number }> {
  const res = await fetch(`https://graph.facebook.com/${GRAPH_VERSION}/${mediaId}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const data = (await res.json()) as {
    url?: string;
    mime_type?: string;
    file_size?: number;
    error?: { message: string };
  };
  if (!res.ok || !data.url) {
    throw new Error(`Meta resolveMediaUrl failed (${res.status}): ${data.error?.message ?? JSON.stringify(data)}`);
  }
  return { url: data.url, mimeType: data.mime_type ?? "application/octet-stream", fileSize: data.file_size ?? 0 };
}

export async function downloadMedia(url: string, accessToken: string): Promise<ArrayBuffer> {
  const res = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } });
  if (!res.ok) {
    throw new Error(`Meta downloadMedia failed (${res.status}): ${res.statusText}`);
  }
  return res.arrayBuffer();
}
