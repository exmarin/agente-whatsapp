import Link from "next/link";
import { notFound } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { IntegrationsForm } from "@/features/workspaces/components/integrations-form";
import { NotificationsForm } from "@/features/workspaces/components/notifications-form";
import { PromptForm } from "@/features/workspaces/components/prompt-form";
import { verifySession } from "@/lib/supabase/dal";

export default async function WorkspaceSettingsPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const { supabase } = await verifySession();

  const { data: workspace } = await supabase
    .from("workspaces")
    .select("id, name, slug, settings")
    .eq("slug", slug)
    .maybeSingle();
  if (!workspace) notFound();

  const notificationEmails =
    (workspace.settings as { notification_emails?: string[] } | null)?.notification_emails ?? [];

  const { data: integrations } = await supabase
    .from("integrations")
    .select("provider, enabled")
    .eq("workspace_id", workspace.id);

  const { data: businessInfo } = await supabase
    .from("business_info")
    .select("free_text")
    .eq("workspace_id", workspace.id)
    .maybeSingle();

  const metaEnabled = integrations?.some((i) => i.provider === "meta" && i.enabled) ?? false;
  const openrouterEnabled = integrations?.some((i) => i.provider === "openrouter" && i.enabled) ?? false;

  return (
    <div className="mx-auto max-w-lg space-y-6 p-6">
      <Link href="/workspaces" className="text-sm text-zinc-500 hover:underline">
        ← Todos los workspaces
      </Link>

      <Card>
        <CardHeader>
          <CardTitle>{workspace.name}</CardTitle>
        </CardHeader>
        <CardContent>
          <IntegrationsForm
            slug={workspace.slug}
            metaEnabled={metaEnabled}
            openrouterEnabled={openrouterEnabled}
            webhookUrl="https://TU-DOMINIO/api/webhooks/meta"
            verifyToken={process.env.META_VERIFY_TOKEN ?? "(META_VERIFY_TOKEN no configurado en .env.local)"}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Prompt del agente</CardTitle>
          <CardDescription>Instrucciones que el agente sigue al responder en este workspace.</CardDescription>
        </CardHeader>
        <CardContent>
          <PromptForm slug={workspace.slug} initialText={businessInfo?.free_text ?? null} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Notificaciones al equipo</CardTitle>
          <CardDescription>Correos que se avisan cuando llega un cliente nuevo o la IA se pausa sola.</CardDescription>
        </CardHeader>
        <CardContent>
          <NotificationsForm slug={workspace.slug} initialEmails={notificationEmails} />
        </CardContent>
      </Card>
    </div>
  );
}
