import { handleInboundMessage } from "@/features/messaging/services/inbound-pipeline";
import { normalizeInbound } from "@/features/messaging/services/normalizer";
import { verifyYCloudSignature } from "@/features/messaging/services/webhook-security";
import { getYCloudIntegration } from "@/features/integrations/services/credentials";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * One path per workspace so the tenant resolves without a lookup before
 * the signature is even checked. See Blueprint §4.1.
 */
export async function POST(request: Request, { params }: { params: Promise<{ workspace: string }> }) {
  const { workspace: slug } = await params;

  const supabase = createAdminClient();
  const { data: workspace } = await supabase
    .from("workspaces")
    .select("id")
    .eq("slug", slug)
    .maybeSingle();
  if (!workspace) return new Response("not found", { status: 404 });

  const integration = await getYCloudIntegration(workspace.id);
  if (!integration) return new Response("ycloud not connected", { status: 404 });

  // Raw body MUST be read before any JSON parsing — the signature is
  // computed over these exact bytes (Blueprint §4.1.1).
  const rawBody = await request.text();
  const verification = verifyYCloudSignature({
    rawBody,
    signatureHeader: request.headers.get("YCloud-Signature"),
    secret: integration.webhookSecret,
  });
  if (!verification.ok) {
    await supabase.from("events").insert({
      workspace_id: workspace.id,
      type: "decision",
      level: "warn",
      payload: { reason: verification.reason, ...verification.debug },
    });
    return new Response(verification.reason, { status: 401 });
  }

  const payload = JSON.parse(rawBody);

  // Ignore anything that isn't a plain inbound message for now (status
  // updates, template review events, echoes) — handled in later phases.
  if (payload.type !== "whatsapp.inbound_message.received") {
    return Response.json({ ok: true });
  }

  try {
    const event = normalizeInbound(payload, workspace.id, integration.defaultCountry);
    await handleInboundMessage(event, workspace.id);
  } catch (error) {
    // Always ACK 2xx so YCloud doesn't retry-storm us; the failure is what
    // matters for debugging, not the HTTP status (Blueprint §4.1 "regla de oro").
    await supabase.from("events").insert({
      workspace_id: workspace.id,
      type: "send_error",
      level: "error",
      payload: { message: error instanceof Error ? error.message : String(error) },
    });
  }

  return Response.json({ ok: true });
}
