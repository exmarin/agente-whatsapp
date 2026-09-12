"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { saveIntegrations, type SaveIntegrationsState } from "../actions";

export function IntegrationsForm({
  slug,
  ycloudEnabled,
  openrouterEnabled,
}: {
  slug: string;
  ycloudEnabled: boolean;
  openrouterEnabled: boolean;
}) {
  const [state, action, pending] = useActionState<SaveIntegrationsState, FormData>(saveIntegrations, undefined);

  return (
    <form action={action} className="space-y-6">
      <input type="hidden" name="slug" value={slug} />

      <fieldset className="space-y-3">
        <legend className="text-sm font-medium">
          YCloud (WhatsApp) {ycloudEnabled && <span className="text-green-600">— conectado</span>}
        </legend>
        <div className="space-y-1.5">
          <Label htmlFor="ycloudApiKey">API key</Label>
          <Input id="ycloudApiKey" name="ycloudApiKey" type="password" placeholder={ycloudEnabled ? "•••••••• (déjalo vacío para no cambiarla)" : ""} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="ycloudWebhookSecret">Webhook secret</Label>
          <Input id="ycloudWebhookSecret" name="ycloudWebhookSecret" type="password" placeholder={ycloudEnabled ? "•••••••• (déjalo vacío para no cambiarla)" : ""} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="ycloudFromNumber">Número de WhatsApp (E.164, ej. +50760000000)</Label>
          <Input id="ycloudFromNumber" name="ycloudFromNumber" placeholder={ycloudEnabled ? "déjalo vacío para no cambiarlo" : "+50760000000"} />
        </div>
        <p className="text-xs text-zinc-500">
          URL del webhook para configurar en YCloud: <code>https://TU-DOMINIO/api/webhooks/ycloud/{slug}</code>
        </p>
      </fieldset>

      <fieldset className="space-y-3">
        <legend className="text-sm font-medium">
          OpenRouter (IA) {openrouterEnabled && <span className="text-green-600">— conectado</span>}
        </legend>
        <div className="space-y-1.5">
          <Label htmlFor="openrouterApiKey">API key</Label>
          <Input
            id="openrouterApiKey"
            name="openrouterApiKey"
            type="password"
            placeholder={openrouterEnabled ? "•••••••• (déjalo vacío para no cambiarla)" : "sk-or-..."}
          />
        </div>
      </fieldset>

      {state?.error && <p className="text-sm text-red-600">{state.error}</p>}
      {state?.success && <p className="text-sm text-green-600">Guardado.</p>}
      <Button type="submit" disabled={pending}>
        {pending ? "Guardando..." : "Guardar"}
      </Button>
    </form>
  );
}
