import { handleInboundMessage } from "@/features/messaging/services/inbound-pipeline";
import { parseMetaWebhook, toUnifiedEvent } from "@/features/messaging/services/normalizer";
import { verifyMetaSignature, resolveMetaChallenge } from "@/features/messaging/services/meta-webhook-security";
import { findWorkspaceIdByPhoneNumberId } from "@/features/integrations/services/credentials";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Single webhook URL for the whole Meta App — Meta subscribes once per app,
 * not per WhatsApp number, so every workspace's messages land here and the
 * tenant is resolved from `phone_number_id` inside the payload (see
 * `findWorkspaceIdByPhoneNumberId`), after the signature check.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const challenge = resolveMetaChallenge({
    mode: url.searchParams.get("hub.mode"),
    token: url.searchParams.get("hub.verify_token"),
    challenge: url.searchParams.get("hub.challenge"),
    verifyToken: process.env.META_VERIFY_TOKEN ?? "",
  });
  if (!challenge) return new Response("forbidden", { status: 403 });
  return new Response(challenge, { status: 200 });
}

export async function POST(request: Request) {
  const appSecret = process.env.META_APP_SECRET;
  if (!appSecret) return new Response("server misconfigured", { status: 500 });

  // Raw body MUST be read before any JSON parsing — the signature is
  // computed over these exact bytes.
  const rawBody = await request.text();
  const verification = verifyMetaSignature({
    rawBody,
    signatureHeader: request.headers.get("X-Hub-Signature-256"),
    appSecret,
  });
  if (!verification.ok) return new Response(verification.reason, { status: 401 });

  const payload = JSON.parse(rawBody);
  const supabase = createAdminClient();

  let messages;
  try {
    messages = parseMetaWebhook(payload);
  } catch {
    // Not a message event (status update, account review, template
    // update, etc.) — nothing to process yet, ACK and move on.
    return Response.json({ ok: true });
  }

  for (const item of messages) {
    const workspaceId = await findWorkspaceIdByPhoneNumberId(item.phoneNumberId);
    if (!workspaceId) continue; // number not configured in any workspace

    try {
      const event = toUnifiedEvent(item, workspaceId);
      await handleInboundMessage(event, workspaceId);
    } catch (error) {
      // Always ACK 2xx so Meta doesn't retry-storm us — the failure is what
      // matters for debugging, not the HTTP status.
      await supabase.from("events").insert({
        workspace_id: workspaceId,
        type: "send_error",
        level: "error",
        payload: { message: error instanceof Error ? error.message : String(error) },
      });
    }
  }

  return Response.json({ ok: true });
}
