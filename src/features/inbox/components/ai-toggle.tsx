"use client";

import { useOptimistic, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
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
    <Button variant={optimisticEnabled ? "default" : "outline"} size="sm" onClick={handleClick} disabled={isPending}>
      {optimisticEnabled ? "IA activa" : "IA apagada"}
    </Button>
  );
}
