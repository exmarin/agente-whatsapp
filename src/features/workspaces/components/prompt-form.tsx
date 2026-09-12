"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { savePrompt, type SavePromptState } from "../actions";

export function PromptForm({ slug, initialText }: { slug: string; initialText: string | null }) {
  const [state, action, pending] = useActionState<SavePromptState, FormData>(savePrompt, undefined);

  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="slug" value={slug} />
      <Textarea
        name="freeText"
        rows={8}
        defaultValue={initialText ?? ""}
        placeholder="Describe el rol del agente, su personalidad, qué puede y no puede hacer, y cómo debe escalar a un humano. Si lo dejas vacío se usa un prompt genérico."
      />
      {state?.error && <p className="text-sm text-red-600">{state.error}</p>}
      {state?.success && <p className="text-sm text-green-600">Guardado.</p>}
      <Button type="submit" disabled={pending}>
        {pending ? "Guardando..." : "Guardar prompt"}
      </Button>
    </form>
  );
}
