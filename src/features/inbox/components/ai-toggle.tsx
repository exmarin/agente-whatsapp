"use client";

import { useOptimistic, useTransition } from "react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { toggleAi } from "../actions/toggle-ai";

export function AiToggle({ conversationId, aiEnabled }: { conversationId: string; aiEnabled: boolean }) {
  const [optimisticEnabled, setOptimisticEnabled] = useOptimistic(aiEnabled);
  const [isPending, startTransition] = useTransition();

  function handleClick() {
    const next = !optimisticEnabled;
    startTransition(async () => {
      setOptimisticEnabled(next);
      try {
        await toggleAi(conversationId, next);
      } catch {
        toast.error("No pudimos cambiar el estado de la IA.");
      }
    });
  }

  return (
    <div className="flex items-center gap-3 rounded-[10px] border py-2 pl-3.5 pr-2">
      <span className="flex flex-col">
        <span className="text-[13px] font-semibold">{optimisticEnabled ? "IA respondiendo" : "IA en pausa"}</span>
        <span className="text-xs text-muted-foreground">
          {optimisticEnabled ? "Responde automáticamente" : "Respondés vos"}
        </span>
      </span>
      <button
        type="button"
        role="switch"
        aria-checked={optimisticEnabled}
        aria-label="Permitir que la IA responda esta conversación"
        onClick={handleClick}
        disabled={isPending}
        className="flex size-11 items-center justify-center rounded-lg disabled:opacity-60"
      >
        <span
          className={cn(
            "relative block h-6 w-10 rounded-full transition-colors",
            optimisticEnabled ? "bg-primary" : "bg-muted-foreground/50",
          )}
        >
          <span
            className={cn(
              "absolute left-0.5 top-0.5 size-5 rounded-full bg-white transition-transform",
              optimisticEnabled && "translate-x-4 bg-primary-foreground",
            )}
          />
        </span>
      </button>
    </div>
  );
}
