import Link from "next/link";
import { notFound } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { IntegrationsForm } from "@/features/workspaces/components/integrations-form";
import { PromptForm } from "@/features/workspaces/components/prompt-form";
import { verifySession } from "@/lib/supabase/dal";

export default async function WorkspaceSettingsPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const { supabase } = await verifySession();

  const { data: workspace } = await supabase.from("workspaces").select("id, name, slug").eq("slug", slug).maybeSingle();
  if (!workspace) notFound();

  const { data: integrations } = await supabase
    .from("integrations")
    .select("provider, enabled")
    .eq("workspace_id", workspace.id);

  const { data: businessInfo } = await supabase
    .from("business_info")
    .select("free_text")
    .eq("workspace_id", workspace.id)
    .maybeSingle();

  const ycloudEnabled = integrations?.some((i) => i.provider === "ycloud" && i.enabled) ?? false;
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
          <IntegrationsForm slug={workspace.slug} ycloudEnabled={ycloudEnabled} openrouterEnabled={openrouterEnabled} />
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
    </div>
  );
}
