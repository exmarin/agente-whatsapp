"use client";

import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Database } from "@/lib/supabase/database.types";
import { cn } from "@/lib/utils";
import { ClientTime } from "@/shared/components/client-time";

export type MessageRow = Database["public"]["Tables"]["messages"]["Row"];

const STATUS_MARK: Record<string, string> = {
  queued: "…",
  sent: "✓",
  delivered: "✓✓",
  read: "✓✓",
  failed: "No enviado",
};

/** Caller MUST render this with `key={conversationId}` so switching
 * conversations remounts it fresh instead of carrying over stale state. */
export function MessageThread({
  conversationId,
  initialMessages,
  senderNames,
}: {
  conversationId: string;
  initialMessages: MessageRow[];
  /** user id → display name for operator-authored messages */
  senderNames: Record<string, string>;
}) {
  const [messages, setMessages] = useState<MessageRow[]>(initialMessages);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`messages-${conversationId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages", filter: `conversation_id=eq.${conversationId}` },
        (payload) => {
          setMessages((prev) => {
            if (prev.some((m) => m.id === (payload.new as MessageRow).id)) return prev;
            return [...prev, payload.new as MessageRow];
          });
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversationId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  if (messages.length === 0) {
    return (
      <div className="flex flex-1 items-center justify-center text-sm text-muted-foreground">
        Sin mensajes todavía
      </div>
    );
  }

  return (
    <div className="min-h-0 flex-1 overflow-y-auto px-7 py-6">
      <div className="flex min-h-full flex-col justify-end gap-4">
        {messages.map((message) => {
          const out = message.direction === "out";
          const fromAi = out && !message.sender_user_id;
          const label = fromAi
            ? "IA · Asistente"
            : out
              ? (senderNames[message.sender_user_id ?? ""] ?? "Equipo")
              : null;
          return (
            <div
              key={message.id}
              className={cn("flex max-w-[520px] flex-col gap-1", out ? "items-end self-end" : "items-start self-start")}
            >
              {label && (
                <span className={cn("text-xs font-semibold", fromAi ? "text-ai-label" : "text-muted-foreground")}>
                  {label}
                </span>
              )}
              <div
                className={cn(
                  "whitespace-pre-wrap rounded-[14px] px-3.5 py-2.5 text-[15px] leading-[22px]",
                  fromAi && "rounded-br-sm bg-ai text-ai-foreground",
                  out && !fromAi && "rounded-br-sm bg-human text-human-foreground",
                  !out && "rounded-bl-sm border bg-card text-card-foreground",
                )}
              >
                {message.body}
              </div>
              <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <ClientTime date={message.created_at} short />
                {out && message.status && <span>{STATUS_MARK[message.status] ?? ""}</span>}
              </span>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>
    </div>
  );
}
