"use client";

import { useEffect, useRef, useState } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { createClient } from "@/lib/supabase/client";
import type { Database } from "@/lib/supabase/database.types";
import { cn } from "@/lib/utils";
import { ClientTime } from "@/shared/components/client-time";

export type MessageRow = Database["public"]["Tables"]["messages"]["Row"];

const STATUS_ICON: Record<string, string> = {
  queued: "🕐",
  sent: "✓",
  delivered: "✓✓",
  read: "✓✓",
  failed: "⚠️",
};

/** Caller MUST render this with `key={conversationId}` so switching
 * conversations remounts it fresh instead of carrying over stale state. */
export function MessageThread({
  conversationId,
  initialMessages,
}: {
  conversationId: string;
  initialMessages: MessageRow[];
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
      <div className="flex flex-1 items-center justify-center text-sm text-zinc-500">
        Sin mensajes todavía
      </div>
    );
  }

  return (
    <ScrollArea className="min-h-0 flex-1 px-4 py-3">
      <div className="flex flex-col gap-2">
        {messages.map((message) => (
          <div
            key={message.id}
            className={cn("flex", message.direction === "out" ? "justify-end" : "justify-start")}
          >
            <div
              className={cn(
                "max-w-md rounded-lg px-3 py-2 text-sm",
                message.direction === "out"
                  ? "bg-emerald-600 text-white"
                  : "bg-white text-zinc-900 dark:bg-zinc-800 dark:text-zinc-100",
              )}
            >
              <p className="whitespace-pre-wrap">{message.body}</p>
              <div
                className={cn(
                  "mt-1 flex items-center gap-1 text-[10px] opacity-70",
                  message.direction === "out" ? "justify-end" : "justify-start",
                )}
              >
                <span>
                  <ClientTime date={message.created_at} />
                </span>
                {message.direction === "out" && message.status && (
                  <span>{STATUS_ICON[message.status] ?? ""}</span>
                )}
                {message.direction === "out" && !message.sender_user_id && <span>· IA</span>}
              </div>
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>
    </ScrollArea>
  );
}
