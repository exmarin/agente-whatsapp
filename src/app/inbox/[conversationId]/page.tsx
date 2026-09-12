import { notFound } from "next/navigation";
import { AiToggle } from "@/features/inbox/components/ai-toggle";
import { Composer } from "@/features/inbox/components/composer";
import { MessageThread } from "@/features/inbox/components/message-thread";
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

  const contact = conversation.contacts as unknown as { name: string | null; phone: string } | null;

  return (
    <>
      <header className="flex items-center justify-between border-b bg-white px-4 py-2 dark:bg-zinc-950">
        <div>
          <p className="font-medium">{contact?.name || contact?.phone || "Desconocido"}</p>
          {contact?.name && <p className="text-xs text-zinc-500">{contact.phone}</p>}
        </div>
        <AiToggle conversationId={conversation.id} aiEnabled={conversation.ai_enabled} />
      </header>
      <MessageThread key={conversationId} conversationId={conversationId} initialMessages={messages ?? []} />
      <Composer conversationId={conversationId} />
    </>
  );
}
