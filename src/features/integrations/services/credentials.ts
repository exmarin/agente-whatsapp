import "server-only";
import { decryptJson, type EncryptedEnvelope } from "@/lib/crypto";
import { createAdminClient } from "@/lib/supabase/admin";

interface YCloudCredentials {
  apiKey: string;
  webhookSecret: string;
}

interface YCloudConfig {
  from: string;
  defaultCountry: string;
}

export async function getYCloudIntegration(workspaceId: string) {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("integrations")
    .select("credentials, config, enabled")
    .eq("workspace_id", workspaceId)
    .eq("provider", "ycloud")
    .maybeSingle();
  if (error) throw error;
  if (!data || !data.enabled) return null;

  const credentials = decryptJson<YCloudCredentials>(data.credentials as unknown as EncryptedEnvelope);
  const config = data.config as unknown as YCloudConfig;
  return { ...credentials, from: config.from, defaultCountry: config.defaultCountry || "1" };
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
