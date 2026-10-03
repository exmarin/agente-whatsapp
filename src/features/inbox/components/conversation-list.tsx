"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Database } from "@/lib/supabase/database.types";
import { cn } from "@/lib/utils";
import { ClientTime } from "@/shared/components/client-time";
import { initialsOf } from "../lib/initials";

type ConversationState = Database["public"]["Enums"]["conversation_state"];
type MessageType = Database["public"]["Enums"]["message_type"];

export interface ConversationListItem {
  id: string;
  state: ConversationState;
  ai_enabled: boolean;
  last_message_at: string | null;
  unread_count: number;
  contacts: { name: string | null; phone: string } | null;
  messages: { body: string | null; type: MessageType }[] | null;
}

const MEDIA_PREVIEW_LABEL: Partial<Record<MessageType, string>> = {
  image: "📷 Imagen",
  audio: "🎵 Audio",
  video: "🎥 Video",
  document: "📄 Documento",
  sticker: "🖼️ Sticker",
};

function previewOf(message: { body: string | null; type: MessageType } | undefined): string {
  if (!message) return "Sin mensajes";
  return message.body || MEDIA_PREVIEW_LABEL[message.type] || "Sin mensajes";
}

type StatusKind = "ai" | "wait" | "human" | "closed";

function statusOf(conv: ConversationListItem): { kind: StatusKind; label: string } {
  if (conv.state === "closed") return { kind: "closed", label: "Cerrado" };
  if (conv.state === "handoff_pending") return { kind: "wait", label: "Esperando humano" };
  if (conv.ai_enabled) return { kind: "ai", label: "IA activa" };
  return { kind: "human", label: "Atención humana" };
}

const TAG_STYLE: Record<StatusKind, { tag: string; dot: string }> = {
  ai: { tag: "bg-ai text-ai-label", dot: "bg-primary" },
  wait: { tag: "bg-warn text-warn-foreground", dot: "bg-warn-foreground" },
  human: { tag: "bg-muted text-foreground", dot: "bg-foreground" },
  closed: { tag: "bg-muted text-muted-foreground", dot: "bg-muted-foreground" },
};

type Filter = "all" | "human" | "closed";

export function ConversationList({ initialConversations }: { initialConversations: ConversationListItem[] }) {
  const router = useRouter();
  const params = useParams<{ conversationId?: string }>();
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("all");

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

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return initialConversations.filter((conv) => {
      const kind = statusOf(conv).kind;
      if (filter === "human" && (kind === "ai" || kind === "closed")) return false;
      if (filter === "closed" && kind !== "closed") return false;
      if (!q) return true;
      const haystack = `${conv.contacts?.name ?? ""} ${conv.contacts?.phone ?? ""} ${conv.messages?.[0]?.body ?? ""}`;
      return haystack.toLowerCase().includes(q);
    });
  }, [initialConversations, query, filter]);

  const humanCount = initialConversations.filter((c) => {
    const kind = statusOf(c).kind;
    return kind === "wait" || kind === "human";
  }).length;

  const tabs: { id: Filter; label: string }[] = [
    { id: "all", label: `Todas · ${initialConversations.length}` },
    { id: "human", label: `Humano · ${humanCount}` },
    { id: "closed", label: "Cerradas" },
  ];

  return (
    <aside className="flex w-96 shrink-0 flex-col border-r bg-card">
      <div className="flex flex-col gap-3 px-5 pb-3 pt-5">
        <h2 className="text-lg font-semibold tracking-tight">Conversaciones</h2>
        <label className="flex h-10 items-center gap-2 rounded-lg border bg-background px-3 text-muted-foreground focus-within:ring-2 focus-within:ring-ring">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <circle cx="11" cy="11" r="7" />
            <path d="m20 20-3.5-3.5" />
          </svg>
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar contacto o mensaje"
            aria-label="Buscar conversaciones"
            className="flex-1 bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
          />
        </label>
        <div className="flex gap-1.5">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setFilter(tab.id)}
              aria-pressed={filter === tab.id}
              className={cn(
                "h-8 rounded-md px-3 text-[13px] font-medium",
                filter === tab.id ? "bg-muted text-foreground" : "text-muted-foreground hover:bg-muted/60",
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>
      <ul className="flex-1 overflow-y-auto px-2 pb-2">
        {visible.map((conv) => {
          const status = statusOf(conv);
          const style = TAG_STYLE[status.kind];
          const name = conv.contacts?.name || conv.contacts?.phone || "Desconocido";
          const selected = params.conversationId === conv.id;
          return (
            <li key={conv.id}>
              <Link
                href={`/inbox/${conv.id}`}
                aria-current={selected ? "page" : undefined}
                className={cn("flex gap-3 rounded-[10px] p-3 hover:bg-muted/60", selected && "bg-ai hover:bg-ai")}
              >
                <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-muted text-[13px] font-semibold">
                  {initialsOf(name) || "?"}
                </span>
                <span className="flex min-w-0 flex-1 flex-col gap-1">
                  <span className="flex items-baseline justify-between gap-2">
                    <span className="truncate text-sm font-semibold">{name}</span>
                    {conv.last_message_at && (
                      <span className="shrink-0 text-xs text-muted-foreground">
                        <ClientTime date={conv.last_message_at} short />
                      </span>
                    )}
                  </span>
                  <span className="truncate text-[13px] leading-[18px] text-muted-foreground">
                    {previewOf(conv.messages?.[0])}
                  </span>
                  <span className="flex items-center gap-2 pt-0.5">
                    <span className={cn("inline-flex h-[22px] items-center gap-1.5 rounded-full px-2 text-xs font-medium", style.tag)}>
                      <span className={cn("size-1.5 rounded-full", style.dot)} />
                      {status.label}
                    </span>
                    {conv.unread_count > 0 && (
                      <span className="ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-xs font-semibold text-primary-foreground">
                        {conv.unread_count}
                      </span>
                    )}
                  </span>
                </span>
              </Link>
            </li>
          );
        })}
        {visible.length === 0 && (
          <li className="p-4 text-sm text-muted-foreground">
            {initialConversations.length === 0
              ? "Aún no hay conversaciones. Aparecerán aquí cuando un contacto escriba."
              : "Ninguna conversación coincide con el filtro."}
          </li>
        )}
      </ul>
    </aside>
  );
}
