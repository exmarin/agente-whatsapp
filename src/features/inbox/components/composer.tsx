"use client";

import { useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import { sendManualMessage } from "../actions/send-message";

export function Composer({ conversationId, aiEnabled }: { conversationId: string; aiEnabled: boolean }) {
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
    <div className="px-7 pb-6 pt-3">
      <form
        ref={formRef}
        onSubmit={handleSubmit}
        className="flex flex-col gap-2 rounded-xl border bg-card py-3 pl-4 pr-3 focus-within:ring-2 focus-within:ring-ring"
      >
        <textarea
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          aria-label="Escribir mensaje"
          placeholder="Escribí un mensaje…"
          rows={2}
          disabled={isPending}
          className="resize-none bg-transparent text-[15px] leading-[22px] outline-none placeholder:text-muted-foreground"
        />
        <div className="flex items-center gap-2">
          <p className="flex-1 text-xs text-muted-foreground">
            {aiEnabled
              ? "La IA está activa: tu mensaje sale como persona del equipo"
              : "IA en pausa: tu mensaje sale como persona del equipo"}
          </p>
          <button
            type="submit"
            disabled={isPending || !value.trim()}
            className="flex h-11 items-center gap-2 rounded-lg bg-primary px-5 text-sm font-semibold text-primary-foreground disabled:opacity-50"
          >
            Enviar
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M22 2 11 13" />
              <path d="M22 2 15 22l-4-9-9-4z" />
            </svg>
          </button>
        </div>
      </form>
    </div>
  );
}
