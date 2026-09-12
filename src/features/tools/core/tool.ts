import type { ZodSchema } from "zod";

export type WorkspaceId = string;

/** E.164 phone number — always includes "+" and country code. */
export type E164 = string;

/**
 * Resolved server-side, never from the LLM. Identity args (contactPhone,
 * conversationId) must come from here, not from tool call arguments —
 * see SECURITY-AUDIT-agente-whatsapp.md SEC-01.
 */
export interface ToolContext {
  workspaceId: WorkspaceId;
  contactPhone: E164;
  conversationId: string;
  /** Decrypted at the point of use only; never logged or passed to the LLM. */
  credentials: Record<string, string>;
}

export interface ToolResult {
  ok: boolean;
  data?: unknown;
  error?: string;
}

/** SEC-01: 'sensitive' tools require human confirmation before run() by default. */
export type ToolSensitivity = "read" | "write" | "sensitive";

export interface Tool<TArgs = unknown> {
  /** snake_case, exposed to the LLM as the function name. */
  name: string;
  description: string;
  sensitivity: ToolSensitivity;
  schema: ZodSchema<TArgs>;
  enabledFor(workspace: WorkspaceId): Promise<boolean>;
  run(args: TArgs, ctx: ToolContext): Promise<ToolResult>;
}
