"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { saveNotificationEmails, type SaveNotificationEmailsState } from "../actions";

export function NotificationsForm({ slug, initialEmails }: { slug: string; initialEmails: string[] }) {
  const [state, action, pending] = useActionState<SaveNotificationEmailsState, FormData>(
    saveNotificationEmails,
    undefined,
  );

  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="slug" value={slug} />
      <Textarea
        name="notificationEmails"
        rows={3}
        defaultValue={initialEmails.join("\n")}
        placeholder="un correo por línea, ej.:&#10;persona1@empresa.com&#10;persona2@empresa.com"
      />
      <p className="text-xs text-zinc-500">
        Se les avisa por correo cuando escribe un cliente nuevo, o cuando la IA se pausa sola (ej. por límite de
        gasto). Dejalo vacío para no avisar a nadie.
      </p>
      {state?.error && <p className="text-sm text-red-600">{state.error}</p>}
      {state?.success && <p className="text-sm text-green-600">Guardado.</p>}
      <Button type="submit" disabled={pending}>
        {pending ? "Guardando..." : "Guardar"}
      </Button>
    </form>
  );
}
