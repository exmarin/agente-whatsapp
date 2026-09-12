"use client";

import { useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { sendManualMessage } from "../actions/send-message";

export function Composer({ conversationId }: { conversationId: string }) {
  const [value, setValue] = useState("");
  const [isPending, startTransition] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!value.trim() || isPending) return;
    const body = value;
    startTransition(async () => {
      const result = await sendManualMessage(conversationId, body);
      if (result?.error) {
        toast.error(result.error);
      } else {
        setValue("");
      }
    });
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      formRef.current?.requestSubmit();
    }
  }

  return (
    <form ref={formRef} onSubmit={handleSubmit} className="flex items-end gap-2 border-t bg-white p-3 dark:bg-zinc-950">
      <Textarea
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Escribe un mensaje..."
        className="min-h-10 flex-1 resize-none"
        rows={1}
        disabled={isPending}
      />
      <Button type="submit" disabled={isPending || !value.trim()}>
        Enviar
      </Button>
    </form>
  );
}
