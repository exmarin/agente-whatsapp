"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createWorkspace, type CreateWorkspaceState } from "../actions";

export function CreateWorkspaceForm() {
  const [state, action, pending] = useActionState<CreateWorkspaceState, FormData>(createWorkspace, undefined);

  return (
    <form action={action} className="flex items-end gap-2">
      <div className="flex-1 space-y-1.5">
        <Label htmlFor="name">Nombre del nuevo workspace</Label>
        <Input id="name" name="name" placeholder="Ej. Clínica Sonrisa" required />
      </div>
      <Button type="submit" disabled={pending}>
        {pending ? "Creando..." : "Crear workspace"}
      </Button>
      {state?.error && <p className="text-sm text-red-600">{state.error}</p>}
    </form>
  );
}
