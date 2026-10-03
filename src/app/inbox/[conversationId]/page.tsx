import { notFound } from "next/navigation";
import { AiToggle } from "@/features/inbox/components/ai-toggle";
import { Composer } from "@/features/inbox/components/composer";
import { initialsOf } from "@/features/inbox/lib/initials";
import { MessageThread } from "@/features/inbox/components/message-thread";
import { MEDIA_BUCKET } from "@/features/messaging/services/media-storage";
import { verifySession } from "@/lib/supabase/dal";

export default async function ConversationPage({
  params,
}: {
  params: Promise<{ conversationId: string }>;
}) {
  const { conversationId } = await params;
  const { supabase } = await verifySession();

  const { data: conversation } = await supabase
    .from("conversations")
    .select("id, ai_enabled, contacts(name, phone)")
    .eq("id", conversationId)
    .maybeSingle();
  if (!conversation) notFound();

  const { data: messages } = await supabase
    .from("messages")
    .select("*")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: true });

  const senderIds = [
    ...new Set((messages ?? []).map((m) => m.sender_user_id).filter((id): id is string => !!id)),
  ];
  const senderNames: Record<string, string> = {};
  if (senderIds.length > 0) {
    const { data: senders } = await supabase.from("users").select("id, full_name").in("id", senderIds);
    for (const u of senders ?? []) senderNames[u.id] = u.full_name;
  }

  const mediaPaths = [
    ...new Set(
      (messages ?? [])
        .map((m) => (m.media as { path?: string } | null)?.path)
        .filter((p): p is string => !!p),
    ),
  ];
  const mediaUrlByPath: Record<string, string> = {};
  if (mediaPaths.length > 0) {
    const { data: signed } = await supabase.storage.from(MEDIA_BUCKET).createSignedUrls(mediaPaths, 3600);
    for (const item of signed ?? []) {
      if (item.path && item.signedUrl) mediaUrlByPath[item.path] = item.signedUrl;
    }
  }
  const messagesWithMedia = (messages ?? []).map((m) => {
    const path = (m.media as { path?: string } | null)?.path;
    return { ...m, mediaUrl: path ? (mediaUrlByPath[path] ?? null) : null };
  });

  const contact = conversation.contacts as unknown as { name: string | null; phone: string } | null;
  const displayName = contact?.name || contact?.phone || "Desconocido";

  return (
    <>
      <header className="flex h-[76px] shrink-0 items-center gap-3.5 border-b bg-card px-7">
        <span className="flex size-10 items-center justify-center rounded-full bg-muted text-sm font-semibold">
          {initialsOf(displayName) || "?"}
        </span>
        <div className="flex flex-1 flex-col gap-0.5">
          <h2 className="text-base font-semibold">{displayName}</h2>
          {contact?.name && <span className="text-[13px] text-muted-foreground">+{contact.phone.replace(/^\+/, "")}</span>}
        </div>
        <AiToggle conversationId={conversation.id} aiEnabled={conversation.ai_enabled} />
      </header>
      <MessageThread
        key={conversationId}
        conversationId={conversationId}
        initialMessages={messagesWithMedia}
        senderNames={senderNames}
      />
      <Composer conversationId={conversationId} aiEnabled={conversation.ai_enabled} />
    </>
  );
}
