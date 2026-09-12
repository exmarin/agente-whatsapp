// One-off dev helper for Fase 1 (US-E1-1): creates your first user, with
// role 'admin' on the 'demo' workspace, so you can log in at /login.
//
// Run with your real values as inline env vars (PowerShell):
//   $env:ADMIN_EMAIL='tu@correo.com'; $env:ADMIN_PASSWORD='una-clave-de-al-menos-8'; `
//   node scripts/create-admin.mjs
//
// Reads NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY from .env.local
// automatically.

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

const supabaseUrl = requireEnv("NEXT_PUBLIC_SUPABASE_URL");
const serviceRoleKey = requireEnv("SUPABASE_SERVICE_ROLE_KEY");
const email = requireEnv("ADMIN_EMAIL");
const password = requireEnv("ADMIN_PASSWORD");

if (password.length < 8) {
  console.error("ADMIN_PASSWORD debe tener al menos 8 caracteres.");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const { data: workspace, error: wsError } = await supabase
  .from("workspaces")
  .select("id")
  .eq("slug", "demo")
  .single();
if (wsError) {
  console.error("No se encontró el workspace 'demo':", wsError.message);
  process.exit(1);
}

const { data: created, error: authError } = await supabase.auth.admin.createUser({
  email,
  password,
  email_confirm: true,
});
if (authError) {
  console.error("No se pudo crear el usuario:", authError.message);
  process.exit(1);
}

const userId = created.user.id;

const { error: userRowError } = await supabase.from("users").upsert({
  id: userId,
  full_name: email.split("@")[0],
  email,
});
if (userRowError) throw userRowError;

const { error: membershipError } = await supabase.from("memberships").upsert(
  { workspace_id: workspace.id, user_id: userId, role: "admin" },
  { onConflict: "workspace_id,user_id" },
);
if (membershipError) throw membershipError;

console.log(`Usuario creado: ${email}, admin del workspace 'demo'.`);
console.log("Ya puedes iniciar sesión en /login con ese email y contraseña.");
