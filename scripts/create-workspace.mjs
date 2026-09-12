// Creates a new workspace (a new client/tenant) and adds an existing admin
// user as its admin. Run once per new client.
//
// Usage (PowerShell):
//   $env:WORKSPACE_NAME='Clínica Sonrisa'; $env:ADMIN_EMAIL='tu@correo.com'; `
//   node scripts/create-workspace.mjs
//
// Optionally set WORKSPACE_SLUG to override the auto-generated slug.

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

function requireEnv(name) {
  const value = process.env[name];
  if (!value) {
    console.error(`Falta ${name}. Pásala como variable de entorno inline.`);
    process.exit(1);
  }
  return value;
}

function slugify(name) {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "") // strip accents (á→a, ñ→n, etc.)
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

const supabaseUrl = requireEnv("NEXT_PUBLIC_SUPABASE_URL");
const serviceRoleKey = requireEnv("SUPABASE_SERVICE_ROLE_KEY");
const name = requireEnv("WORKSPACE_NAME");
const adminEmail = requireEnv("ADMIN_EMAIL");
const slug = process.env.WORKSPACE_SLUG || slugify(name);

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const { data: workspace, error: wsError } = await supabase
  .from("workspaces")
  .insert({ name, slug })
  .select("id, slug")
  .single();
if (wsError) {
  console.error("No se pudo crear el workspace:", wsError.message);
  process.exit(1);
}

// Find the existing auth user by email (paginates in case of many users).
let userId = null;
for (let page = 1; !userId; page++) {
  const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 200 });
  if (error) throw error;
  userId = data.users.find((u) => u.email === adminEmail)?.id ?? null;
  if (data.users.length < 200) break;
}
if (!userId) {
  console.error(`No existe ningún usuario con email ${adminEmail}. Créalo primero con scripts/create-admin.mjs.`);
  process.exit(1);
}

const { error: membershipError } = await supabase
  .from("memberships")
  .insert({ workspace_id: workspace.id, user_id: userId, role: "admin" });
if (membershipError) throw membershipError;

console.log(`Workspace '${workspace.slug}' creado. ${adminEmail} es admin.`);
console.log(`Siguiente paso: conectar sus credenciales:`);
console.log(
  `  $env:WORKSPACE_SLUG='${workspace.slug}'; $env:YCLOUD_API_KEY='...'; $env:YCLOUD_WEBHOOK_SECRET='...'; $env:YCLOUD_FROM_NUMBER='...'; $env:OPENROUTER_API_KEY='...'; node scripts/connect-integrations.mjs`,
);
