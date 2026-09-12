// One-off dev helper for Fase 1: connects YCloud + OpenRouter to a workspace
// by writing encrypted credentials into `integrations`. A real Settings →
// Integrations UI (Fase 6+) will replace this.
//
// Run with your real values as inline env vars (PowerShell):
//   $env:WORKSPACE_SLUG='demo'; $env:YCLOUD_API_KEY='...'; $env:YCLOUD_WEBHOOK_SECRET='...'; `
//   $env:YCLOUD_FROM_NUMBER='+50760000000'; $env:OPENROUTER_API_KEY='sk-or-...'; `
//   node scripts/connect-integrations.mjs
//
// WORKSPACE_SLUG defaults to 'demo' if not set. Use scripts/create-workspace.mjs
// first to create a new client's workspace.
//
// Reads NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY / ENCRYPTION_KEY
// from .env.local automatically (no need to set those manually).

import { createCipheriv, randomBytes, scryptSync } from "node:crypto";
import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

function loadEnvLocal() {
  const path = new URL("../.env.local", import.meta.url);
  const content = readFileSync(path, "utf8");
  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    const value = trimmed.slice(eq + 1).trim();
    if (!(key in process.env)) process.env[key] = value;
  }
}
loadEnvLocal();

function encryptJson(value, encryptionKey) {
  const key = scryptSync(encryptionKey, "agente-whatsapp-credentials", 32);
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const plaintext = Buffer.from(JSON.stringify(value), "utf8");
  const enc = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  const tag = cipher.getAuthTag();
  return { enc: enc.toString("base64"), iv: iv.toString("base64"), tag: tag.toString("base64"), key_id: "v1" };
}

function requireEnv(name) {
  const value = process.env[name];
  if (!value) {
    console.error(`Falta ${name}. Pásala como variable de entorno inline.`);
    process.exit(1);
  }
  return value;
}

const supabaseUrl = requireEnv("NEXT_PUBLIC_SUPABASE_URL");
const serviceRoleKey = requireEnv("SUPABASE_SERVICE_ROLE_KEY");
const encryptionKey = requireEnv("ENCRYPTION_KEY");

const workspaceSlug = process.env.WORKSPACE_SLUG || "demo";

const supabase = createClient(supabaseUrl, serviceRoleKey);

const { data: workspace, error: wsError } = await supabase
  .from("workspaces")
  .select("id")
  .eq("slug", workspaceSlug)
  .single();
if (wsError) {
  console.error(`No se encontró el workspace '${workspaceSlug}':`, wsError.message);
  process.exit(1);
}

const ycloudApiKey = process.env.YCLOUD_API_KEY;
const ycloudWebhookSecret = process.env.YCLOUD_WEBHOOK_SECRET;
const ycloudFromNumber = process.env.YCLOUD_FROM_NUMBER;
const openrouterApiKey = process.env.OPENROUTER_API_KEY;

if (ycloudApiKey && ycloudWebhookSecret && ycloudFromNumber) {
  const { error } = await supabase.from("integrations").upsert(
    {
      workspace_id: workspace.id,
      provider: "ycloud",
      enabled: true,
      credentials: encryptJson({ apiKey: ycloudApiKey, webhookSecret: ycloudWebhookSecret }, encryptionKey),
      config: { from: ycloudFromNumber, defaultCountry: process.env.YCLOUD_DEFAULT_COUNTRY || "1" },
    },
    { onConflict: "workspace_id,provider" },
  );
  if (error) throw error;
  console.log(`YCloud conectado al workspace '${workspaceSlug}'.`);
} else {
  console.log("YCLOUD_API_KEY / YCLOUD_WEBHOOK_SECRET / YCLOUD_FROM_NUMBER no venían completos — se omitió YCloud.");
}

if (openrouterApiKey) {
  const { error } = await supabase.from("integrations").upsert(
    {
      workspace_id: workspace.id,
      provider: "openrouter",
      enabled: true,
      credentials: encryptJson({ apiKey: openrouterApiKey }, encryptionKey),
      config: {},
    },
    { onConflict: "workspace_id,provider" },
  );
  if (error) throw error;
  console.log(`OpenRouter conectado al workspace '${workspaceSlug}'.`);
} else {
  console.log("OPENROUTER_API_KEY no vino — se omitió OpenRouter.");
}

console.log("\nWebhook URL para YCloud (usa tu URL pública/ngrok + este path):");
console.log(`  https://TU-URL/api/webhooks/ycloud/${workspaceSlug}`);
