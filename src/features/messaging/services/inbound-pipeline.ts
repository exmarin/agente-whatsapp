import "server-only";
import { generateReply } from "@/features/ai/services/openrouter";
import { resolveSystemPrompt } from "@/features/ai/services/prompt";
import { getOpenRouterIntegration, getYCloudIntegration } from "@/features/integrations/services/credentials";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Database } from "@/lib/supabase/database.types";
import type { UnifiedInboundEvent } from "../types";
import { sendText } from "./ycloud-client";

type MessageType = Database["public"]["Enums"]["message_type"];

const SUPPORTED_INBOUND_TYPES: readonly MessageType[] = [
  "text",
  "audio",
  "image",
  "document",
  "video",
  "sticker",
];

function toMessageType(type: string): MessageType {
  return (SUPPORTED_INBOUND_TYPES as readonly string[]).includes(type) ? (type as MessageType) : "system";
}

/**
 * F1 "camino feliz": persist the inbound message, and if the conversation
 * has the AI enabled, generate and send a text reply. No buffer (Fase 2),
 * no decision engine (Fase 3), no tools (Fase 6) yet — those wrap this.
 */
export async function handleInboundMessage(event: UnifiedInboundEvent, workspaceId: string): Promise<void> {
  const supabase = createAdminClient();

  const { data: contact, error: contactError } = await supabase
    .from("contacts")
    .upsert(
      { workspace_id: workspaceId, phone: event.from, name: event.contactName },
      { onConflict: "workspace_id,phone" },
    )
    .select()
    .single();
  if (contactError) throw contactError;

  const nowIso = new Date(event.ts).toISOString();
  const windowExpiresIso = new Date(event.ts + 24 * 60 * 60 * 1000).toISOString();

  const { data: conversation, error: convError } = await supabase
    .from("conversations")
    .upsert(
      {
        workspace_id: workspaceId,
        contact_id: contact.id,
        channel: "whatsapp",
        last_message_at: nowIso,
        window_expires_at: windowExpiresIso,
      },
      { onConflict: "workspace_id,contact_id,channel" },
    )
    .select()
    .single();
  if (convError) throw convError;

  const { error: inboundError } = await supabase.from("messages").insert({
    workspace_id: workspaceId,
    conversation_id: conversation.id,
    direction: "in",
    type: toMessageType(event.type),
    body: event.text ?? null,
    wamid: event.wamid,
    meta: { contactName: event.contactName ?? null, raw: event.raw as never },
  });
  if (inboundError) {
    if (inboundError.code === "23505") return; // duplicate wamid — already processed
    throw inboundError;
  }

  if (!conversation.ai_enabled || event.type !== "text" || !event.text) return;

  const [ycloud, openrouter] = await Promise.all([
    getYCloudIntegration(workspaceId),
    getOpenRouterIntegration(workspaceId),
  ]);
  if (!ycloud || !openrouter) {
    await supabase.from("events").insert({
      workspace_id: workspaceId,
      conversation_id: conversation.id,
      type: "decision",
      level: "warn",
      payload: { reason: "missing_integration", ycloud: !!ycloud, openrouter: !!openrouter },
    });
    return;
  }

  const systemPrompt = await resolveSystemPrompt(workspaceId);
  const reply = await generateReply({
    systemPrompt,
    userText: event.text,
    apiKey: openrouter.apiKey,
  });

  const sent = await sendText({
    from: ycloud.from,
    to: event.from,
    body: reply.text,
    apiKey: ycloud.apiKey,
  });

  await supabase.from("messages").insert({
    workspace_id: workspaceId,
    conversation_id: conversation.id,
    direction: "out",
    type: "text",
    body: reply.text,
    wamid: sent.wamid,
    status: "sent",
    meta: { model: reply.modelUsed, cost: reply.cost },
  });

  await supabase.from("events").insert({
    workspace_id: workspaceId,
    conversation_id: conversation.id,
    type: "llm_usage",
    payload: { model: reply.modelUsed, cost: reply.cost },
  });
}
