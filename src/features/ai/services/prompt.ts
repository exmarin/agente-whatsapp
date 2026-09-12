import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

// F7 (Blueprint §4.4.1) replaces this with the full hierarchy resolver
// (workspace > número > campaña > segmento > modo) + prompt_versions with
// draft/published state. Until then: one free-text prompt per workspace,
// stored in business_info.free_text, with this generic skeleton as fallback
// for workspaces that haven't configured one yet.
export const FALLBACK_SYSTEM_PROMPT = `Rol: Eres un asistente de WhatsApp para un negocio.
Personalidad: Habla de forma breve, clara y amable, en español.
Objetivos: Responder las dudas del cliente y ayudarlo a avanzar.
Qué nunca debes hacer: Inventar información que no tienes. Prometer cosas que no puedes garantizar.
Qué sí puedes hacer: Responder preguntas generales y orientar al cliente.
Cómo escalas: Si no puedes resolver algo, dilo honestamente y sugiere que un humano lo va a contactar pronto.`;

export async function resolveSystemPrompt(workspaceId: string): Promise<string> {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("business_info")
    .select("free_text")
    .eq("workspace_id", workspaceId)
    .maybeSingle();

  return data?.free_text?.trim() || FALLBACK_SYSTEM_PROMPT;
}
