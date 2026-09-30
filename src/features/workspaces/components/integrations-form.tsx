"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { saveIntegrations, type SaveIntegrationsState } from "../actions";

export function IntegrationsForm({
  slug,
  metaEnabled,
  openrouterEnabled,
  webhookUrl,
  verifyToken,
}: {
  slug: string;
  metaEnabled: boolean;
  openrouterEnabled: boolean;
  webhookUrl: string;
  verifyToken: string;
}) {
  const [state, action, pending] = useActionState<SaveIntegrationsState, FormData>(saveIntegrations, undefined);

  return (
    <form action={action} className="space-y-6">
      <input type="hidden" name="slug" value={slug} />

      <fieldset className="space-y-3">
        <legend className="text-sm font-medium">
          WhatsApp (Meta Cloud API) {metaEnabled && <span className="text-green-600">— conectado</span>}
        </legend>
        <div className="space-y-1.5">
          <Label htmlFor="metaAccessToken">Access token</Label>
          <Input
            id="metaAccessToken"
            name="metaAccessToken"
            type="password"
            placeholder={metaEnabled ? "•••••••• (déjalo vacío para no cambiarlo)" : ""}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="metaPhoneNumberId">Phone number ID</Label>
          <Input
            id="metaPhoneNumberId"
            name="metaPhoneNumberId"
            placeholder={metaEnabled ? "déjalo vacío para no cambiarlo" : "ej. 1335332349663921"}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="metaWabaId">WABA ID (opcional)</Label>
          <Input id="metaWabaId" name="metaWabaId" placeholder="ej. 924309933733319" />
        </div>
        <div className="space-y-1 rounded-md bg-zinc-50 p-3 text-xs text-zinc-600">
          <p>
            Esto se configura <strong>una sola vez</strong> en tu app de Meta (Webhooks → suscribir el WhatsApp
            Business Account), no por workspace:
          </p>
          <p>
            Callback URL: <code>{webhookUrl}</code>
          </p>
          <p>
            Verify token: <code>{verifyToken}</code>
          </p>
        </div>
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
