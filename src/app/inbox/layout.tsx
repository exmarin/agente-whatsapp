import Link from "next/link";
import { ConversationList, type ConversationListItem } from "@/features/inbox/components/conversation-list";
import { verifySession } from "@/lib/supabase/dal";
import { logout } from "../login/actions";
import { Button } from "@/components/ui/button";

export default async function InboxLayout({ children }: { children: React.ReactNode }) {
  const { supabase } = await verifySession();

  const { data: conversations } = await supabase
    .from("conversations")
    .select("id, state, ai_enabled, last_message_at, unread_count, contacts(name, phone)")
    .order("last_message_at", { ascending: false, nullsFirst: false })
    .returns<ConversationListItem[]>();

  return (
    <div className="flex h-screen flex-col bg-zinc-50 dark:bg-black">
      <header className="flex items-center justify-between border-b bg-white px-4 py-2 dark:bg-zinc-950">
        <h1 className="text-sm font-semibold">Agente WhatsApp</h1>
        <div className="flex items-center gap-2">
          <Button render={<Link href="/workspaces" />} nativeButton={false} variant="ghost" size="sm">
            Workspaces
          </Button>
          <form action={logout}>
            <Button type="submit" variant="ghost" size="sm">
              Cerrar sesión
            </Button>
          </form>
        </div>
      </header>
      <div className="flex flex-1 overflow-hidden">
        <ConversationList initialConversations={conversations ?? []} />
        <main className="flex flex-1 flex-col overflow-hidden">{children}</main>
      </div>
    </div>
  );
}
