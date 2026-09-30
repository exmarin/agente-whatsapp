import "server-only";
import { decryptJson, type EncryptedEnvelope } from "@/lib/crypto";
import { createAdminClient } from "@/lib/supabase/admin";

interface MetaCredentials {
  accessToken: string;
}

interface MetaConfig {
  phoneNumberId: string;
  wabaId?: string | null;
}

export async function getMetaIntegration(workspaceId: string) {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("integrations")
    .select("credentials, config, enabled")
    .eq("workspace_id", workspaceId)
    .eq("provider", "meta")
    .maybeSingle();
  if (error) throw error;
  if (!data || !data.enabled) return null;

  const credentials = decryptJson<MetaCredentials>(data.credentials as unknown as EncryptedEnvelope);
  const config = data.config as unknown as MetaConfig;
  return { ...credentials, phoneNumberId: config.phoneNumberId, wabaId: config.wabaId ?? null };
}

/**
 * Meta's webhook is one URL for the whole app (subscribed once, not per
 * workspace) — every inbound event carries `phone_number_id`, and this is
 * how it resolves to a tenant. Requires each workspace's `meta` integration
 * config to store that ID (see `saveIntegrations`).
 */
export async function findWorkspaceIdByPhoneNumberId(phoneNumberId: string): Promise<string | null> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("integrations")
    .select("workspace_id")
    .eq("provider", "meta")
    .eq("enabled", true)
    .eq("config->>phoneNumberId", phoneNumberId)
    .maybeSingle();
  if (error) throw error;
  return data?.workspace_id ?? null;
}

interface OpenRouterCredentials {
  apiKey: string;
}

export async function getOpenRouterIntegration(workspaceId: string) {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("integrations")
    .select("credentials, enabled")
    .eq("workspace_id", workspaceId)
    .eq("provider", "openrouter")
    .maybeSingle();
  if (error) throw error;
  if (!data || !data.enabled) return null;

  return decryptJson<OpenRouterCredentials>(data.credentials as unknown as EncryptedEnvelope);
}
