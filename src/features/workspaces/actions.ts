"use server";

import { redirect } from "next/navigation";
import { encryptJson } from "@/lib/crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import { verifySession } from "@/lib/supabase/dal";
import type { Json } from "@/lib/supabase/database.types";

export type CreateWorkspaceState = { error?: string } | undefined;

function slugify(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

async function uniqueSlug(admin: ReturnType<typeof createAdminClient>, base: string): Promise<string> {
  const { data } = await admin.from("workspaces").select("slug").like("slug", `${base}%`);
  const taken = new Set((data ?? []).map((row) => row.slug));
  if (!taken.has(base)) return base;
  for (let n = 2; ; n++) {
    const candidate = `${base}-${n}`;
    if (!taken.has(candidate)) return candidate;
  }
}

export async function createWorkspace(
  _prevState: CreateWorkspaceState,
  formData: FormData,
): Promise<CreateWorkspaceState> {
  const { user } = await verifySession();

  const name = formData.get("name");
  if (typeof name !== "string" || !name.trim()) {
    return { error: "El nombre del workspace es requerido." };
  }

  const base = slugify(name);
  if (!base) return { error: "Ese nombre no genera un identificador válido." };

  const admin = createAdminClient();
  const slug = await uniqueSlug(admin, base);

  const { data: workspace, error: wsError } = await admin
    .from("workspaces")
    .insert({ name: name.trim(), slug })
    .select("id, slug")
    .single();
  if (wsError) return { error: `No se pudo crear el workspace: ${wsError.message}` };

  const { error: userError } = await admin.from("users").upsert({
    id: user.id,
    full_name: (user.user_metadata?.full_name as string | undefined) || user.email!.split("@")[0],
    email: user.email!,
  });
  if (userError) return { error: `No se pudo preparar tu perfil: ${userError.message}` };

  const { error: membershipError } = await admin
    .from("memberships")
    .insert({ workspace_id: workspace.id, user_id: user.id, role: "admin" });
  if (membershipError) return { error: `No se pudo asignarte como admin: ${membershipError.message}` };

  redirect(`/workspaces/${slug}`);
}

export type SaveIntegrationsState = { error?: string; success?: boolean } | undefined;

export async function saveIntegrations(
  _prevState: SaveIntegrationsState,
  formData: FormData,
): Promise<SaveIntegrationsState> {
  const { user, supabase } = await verifySession();

  const slug = formData.get("slug");
  if (typeof slug !== "string" || !slug) return { error: "Workspace inválido." };

  const { data: workspace } = await supabase.from("workspaces").select("id").eq("slug", slug).maybeSingle();
  if (!workspace) return { error: "No tienes acceso a ese workspace." };

  const { data: membership } = await supabase
    .from("memberships")
    .select("role")
    .eq("workspace_id", workspace.id)
    .eq("user_id", user.id)
    .eq("is_active", true)
    .maybeSingle();
  if (!membership || membership.role !== "admin") {
    return { error: "Solo un admin del workspace puede conectar integraciones." };
  }

  const metaAccessToken = String(formData.get("metaAccessToken") ?? "").trim();
  const metaPhoneNumberId = String(formData.get("metaPhoneNumberId") ?? "").trim();
  const metaWabaId = String(formData.get("metaWabaId") ?? "").trim();
  const openrouterApiKey = String(formData.get("openrouterApiKey") ?? "").trim();

  const admin = createAdminClient();

  if (metaAccessToken || metaPhoneNumberId) {
    if (!metaAccessToken || !metaPhoneNumberId) {
      return { error: "Para conectar WhatsApp completa el access token y el phone number ID." };
    }
    const { error } = await admin.from("integrations").upsert(
      {
        workspace_id: workspace.id,
        provider: "meta",
        enabled: true,
        credentials: encryptJson({ accessToken: metaAccessToken }) as unknown as Json,
        config: { phoneNumberId: metaPhoneNumberId, wabaId: metaWabaId || null },
      },
      { onConflict: "workspace_id,provider" },
    );
    if (error) return { error: `No se pudo guardar WhatsApp: ${error.message}` };
  }

  if (openrouterApiKey) {
    const { error } = await admin.from("integrations").upsert(
      {
        workspace_id: workspace.id,
        provider: "openrouter",
        enabled: true,
        credentials: encryptJson({ apiKey: openrouterApiKey }) as unknown as Json,
        config: {},
      },
      { onConflict: "workspace_id,provider" },
    );
    if (error) return { error: `No se pudo guardar OpenRouter: ${error.message}` };
  }

  return { success: true };
}

export type SavePromptState = { error?: string; success?: boolean } | undefined;

export async function savePrompt(_prevState: SavePromptState, formData: FormData): Promise<SavePromptState> {
  const { supabase } = await verifySession();

  const slug = formData.get("slug");
  const freeText = formData.get("freeText");
  if (typeof slug !== "string" || !slug) return { error: "Workspace inválido." };
  if (typeof freeText !== "string") return { error: "Prompt inválido." };

  const { data: workspace } = await supabase.from("workspaces").select("id").eq("slug", slug).maybeSingle();
  if (!workspace) return { error: "No tienes acceso a ese workspace." };

  const { error } = await supabase
    .from("business_info")
    .upsert({ workspace_id: workspace.id, free_text: freeText.trim() || null }, { onConflict: "workspace_id" });
  if (error) return { error: `No se pudo guardar el prompt (¿eres admin o manager de este workspace?): ${error.message}` };

  return { success: true };
}

export type SaveNotificationEmailsState = { error?: string; success?: boolean } | undefined;

export async function saveNotificationEmails(
  _prevState: SaveNotificationEmailsState,
  formData: FormData,
): Promise<SaveNotificationEmailsState> {
  const { supabase } = await verifySession();

  const slug = formData.get("slug");
  const raw = formData.get("notificationEmails");
  if (typeof slug !== "string" || !slug) return { error: "Workspace inválido." };
  if (typeof raw !== "string") return { error: "Lista de correos inválida." };

  const emails = raw
    .split(/[,\n]/)
    .map((e) => e.trim())
    .filter(Boolean);
  const invalid = emails.find((e) => !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e));
  if (invalid) return { error: `"${invalid}" no parece un email válido.` };

  const { data: workspace } = await supabase
    .from("workspaces")
    .select("id, settings")
    .eq("slug", slug)
    .maybeSingle();
  if (!workspace) return { error: "No tienes acceso a ese workspace." };

  const settings = (workspace.settings as Record<string, unknown>) ?? {};
  const { error } = await supabase
    .from("workspaces")
    .update({ settings: { ...settings, notification_emails: emails } })
    .eq("id", workspace.id);
  if (error) return { error: `No se pudo guardar (¿eres admin de este workspace?): ${error.message}` };

  return { success: true };
}
