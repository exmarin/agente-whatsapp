"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { createClient } from "@/lib/supabase/client";
import type { Database } from "@/lib/supabase/database.types";
import { cn } from "@/lib/utils";
import { ClientTime } from "@/shared/components/client-time";

type ConversationState = Database["public"]["Enums"]["conversation_state"];

export interface ConversationListItem {
  id: string;
  state: ConversationState;
  ai_enabled: boolean;
  last_message_at: string | null;
  unread_count: number;
  contacts: { name: string | null; phone: string } | null;
}

const STATE_LABEL: Record<ConversationState, string> = {
  ai_active: "IA",
  human_active: "Humano",
  handoff_pending: "Handoff",
  waiting_reply: "Esperando",
  paused: "Pausada",
  closed: "Cerrada",
};

export function ConversationList({ initialConversations }: { initialConversations: ConversationListItem[] }) {
  const router = useRouter();
  const params = useParams<{ conversationId?: string }>();

  // MVP realtime: any change to conversations re-fetches the server-rendered
  // list. Simple and correct; a finer-grained client merge is a later polish.
  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel("inbox-conversations")
      .on("postgres_changes", { event: "*", schema: "public", table: "conversations" }, () => {
        router.refresh();
      })
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [router]);

  return (
    <ScrollArea className="w-80 shrink-0 border-r bg-white dark:bg-zinc-950">
      <ul>
        {initialConversations.map((conv) => (
          <li key={conv.id}>
            <Link
              href={`/inbox/${conv.id}`}
              className={cn(
                "flex flex-col gap-1 border-b px-4 py-3 hover:bg-zinc-50 dark:hover:bg-zinc-900",
                params.conversationId === conv.id && "bg-zinc-100 dark:bg-zinc-900",
              )}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="truncate font-medium">
                  {conv.contacts?.name || conv.contacts?.phone || "Desconocido"}
                </span>
                {conv.unread_count > 0 && <Badge>{conv.unread_count}</Badge>}
              </div>
              <div className="flex items-center gap-2 text-xs text-zinc-500">
                <Badge variant="outline">{STATE_LABEL[conv.state] ?? conv.state}</Badge>
                {conv.last_message_at && (
                  <span>
                    <ClientTime date={conv.last_message_at} />
                  </span>
                )}
              </div>
            </Link>
          </li>
        ))}
        {initialConversations.length === 0 && (
          <li className="p-4 text-sm text-zinc-500">
            Aún no hay conversaciones. Aparecerán aquí cuando un contacto escriba.
          </li>
        )}
      </ul>
    </ScrollArea>
  );
}
