"use server";

import { revalidatePath } from "next/cache";
import { getYCloudIntegration } from "@/features/integrations/services/credentials";
import { sendText } from "@/features/messaging/services/ycloud-client";
import { verifySession } from "@/lib/supabase/dal";

export async function sendManualMessage(conversationId: string, body: string) {
  const trimmed = body.trim();
  if (!trimmed) return { error: "El mensaje no puede estar vacío." };

  const { user, supabase } = await verifySession();

  const { data: conversation, error: convError } = await supabase
    .from("conversations")
    .select("workspace_id, contacts(phone)")
    .eq("id", conversationId)
    .single();
  if (convError || !conversation) return { error: "Conversación no encontrada." };

  const ycloud = await getYCloudIntegration(conversation.workspace_id);
  if (!ycloud) return { error: "YCloud no está conectado en este workspace todavía." };

  const contactPhone = (conversation.contacts as unknown as { phone: string } | null)?.phone;
  if (!contactPhone) return { error: "No se encontró el teléfono del contacto." };

  let sent;
  try {
    sent = await sendText({ from: ycloud.from, to: contactPhone, body: trimmed, apiKey: ycloud.apiKey });
  } catch (error) {
    return { error: error instanceof Error ? error.message : "No pudimos enviar el mensaje." };
  }

  // NOTE (F1, pre-Fase 4): no 24h-window guardrail here yet — see
  // US-E4-2 in USER-STORIES-agente-whatsapp.md, which adds the hard
  // block on free text outside the window. Not applicable to E1.
  const { error: insertError } = await supabase.from("messages").insert({
    workspace_id: conversation.workspace_id,
    conversation_id: conversationId,
    direction: "out",
    type: "text",
    body: trimmed,
    wamid: sent.wamid,
    status: "sent",
    sender_user_id: user.id,
  });
  if (insertError) return { error: "El mensaje se envió pero no se pudo guardar." };

  revalidatePath(`/inbox/${conversationId}`);
  return { ok: true };
}
