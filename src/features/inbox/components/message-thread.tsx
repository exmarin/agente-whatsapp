"use client";

import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Database } from "@/lib/supabase/database.types";
import { cn } from "@/lib/utils";
import { ClientTime } from "@/shared/components/client-time";

export type MessageRow = Database["public"]["Tables"]["messages"]["Row"];
export type MessageWithMedia = MessageRow & { mediaUrl: string | null };

const STATUS_MARK: Record<string, string> = {
  queued: "…",
  sent: "✓",
  delivered: "✓✓",
  read: "✓✓",
  failed: "No enviado",
};

const MEDIA_BUCKET = "media";

function mediaOf(message: MessageRow): { path: string; mimeType: string } | null {
  const media = message.media as { path?: string; mimeType?: string } | null;
  return media?.path && media?.mimeType ? { path: media.path, mimeType: media.mimeType } : null;
}

/** Caller MUST render this with `key={conversationId}` so switching
 * conversations remounts it fresh instead of carrying over stale state. */
export function MessageThread({
  conversationId,
  initialMessages,
  senderNames,
}: {
  conversationId: string;
  initialMessages: MessageWithMedia[];
  /** user id → display name for operator-authored messages */
  senderNames: Record<string, string>;
}) {
  const [messages, setMessages] = useState<MessageWithMedia[]>(initialMessages);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`messages-${conversationId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages", filter: `conversation_id=eq.${conversationId}` },
        async (payload) => {
          const row = payload.new as MessageRow;
          let mediaUrl: string | null = null;
          const media = mediaOf(row);
          if (media) {
            const { data } = await supabase.storage.from(MEDIA_BUCKET).createSignedUrl(media.path, 3600);
            mediaUrl = data?.signedUrl ?? null;
          }
          setMessages((prev) => {
            if (prev.some((m) => m.id === row.id)) return prev;
            return [...prev, { ...row, mediaUrl }];
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
          const media = mediaOf(message);
          const isImage = media?.mimeType.startsWith("image/");
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
                  "flex flex-col gap-2 whitespace-pre-wrap rounded-[14px] px-3.5 py-2.5 text-[15px] leading-[22px]",
                  fromAi && "rounded-br-sm bg-ai text-ai-foreground",
                  out && !fromAi && "rounded-br-sm bg-human text-human-foreground",
                  !out && "rounded-bl-sm border bg-card text-card-foreground",
                )}
              >
                {media &&
                  (isImage ? (
                    message.mediaUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element -- signed URL, expires; next/image can't cache it usefully
                      <img
                        src={message.mediaUrl}
                        alt={message.body ?? "Imagen"}
                        className="max-h-80 max-w-full rounded-[10px] object-contain"
                      />
                    ) : (
                      <span className="text-sm italic opacity-70">Imagen no disponible</span>
                    )
                  ) : message.mediaUrl ? (
                    <a
                      href={message.mediaUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1.5 underline underline-offset-2"
                    >
                      📎 Ver archivo adjunto
                    </a>
                  ) : (
                    <span className="text-sm italic opacity-70">Archivo no disponible</span>
                  ))}
                {message.body && <span>{message.body}</span>}
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
