import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CreateWorkspaceForm } from "@/features/workspaces/components/create-workspace-form";
import { verifySession } from "@/lib/supabase/dal";

export default async function WorkspacesPage() {
  const { user, supabase } = await verifySession();

  const { data: memberships } = await supabase
    .from("memberships")
    .select("role, workspaces(name, slug)")
    .eq("user_id", user.id)
    .eq("is_active", true);

  const workspaces = (memberships ?? []) as unknown as {
    role: string;
    workspaces: { name: string; slug: string } | null;
  }[];

  return (
    <div className="mx-auto max-w-lg space-y-6 p-6">
      <Link href="/inbox" className="text-sm text-zinc-500 hover:underline">
        ← Volver al inbox
      </Link>

      <Card>
        <CardHeader>
          <CardTitle>Tus workspaces</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {workspaces.length === 0 && <p className="text-sm text-zinc-500">Aún no perteneces a ningún workspace.</p>}
          {workspaces.map(
            (m) =>
              m.workspaces && (
                <Link
                  key={m.workspaces.slug}
                  href={`/workspaces/${m.workspaces.slug}`}
                  className="flex items-center justify-between rounded-lg border px-3 py-2 text-sm hover:bg-zinc-50 dark:hover:bg-zinc-900"
                >
                  <span>{m.workspaces.name}</span>
                  <span className="text-xs text-zinc-500">{m.role}</span>
                </Link>
              ),
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Crear un workspace nuevo</CardTitle>
        </CardHeader>
        <CardContent>
          <CreateWorkspaceForm />
        </CardContent>
      </Card>
    </div>
  );
}
