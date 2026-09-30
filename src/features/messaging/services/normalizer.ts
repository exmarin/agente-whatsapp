import { z } from "zod";
import type { E164, InboundType, UnifiedInboundEvent, WorkspaceId } from "../types";

const MetaMediaSchema = z.object({
  id: z.string(),
  mime_type: z.string().optional(),
  sha256: z.string().optional(),
  caption: z.string().optional(),
});

/** Meta Cloud API's real webhook shape for `messages` field changes. */
const MetaWebhookSchema = z.object({
  object: z.literal("whatsapp_business_account"),
  entry: z.array(
    z.object({
      id: z.string(), // WABA ID
      changes: z.array(
        z.object({
          field: z.string(),
          value: z.object({
            messaging_product: z.literal("whatsapp"),
            metadata: z.object({
              display_phone_number: z.string().optional(),
              phone_number_id: z.string(),
            }),
            contacts: z
              .array(z.object({ profile: z.object({ name: z.string().optional() }).optional(), wa_id: z.string() }))
              .optional(),
            messages: z
              .array(
                z.object({
                  from: z.string(),
                  id: z.string(),
                  timestamp: z.string(),
                  type: z.string(),
                  text: z.object({ body: z.string() }).optional(),
                  image: MetaMediaSchema.optional(),
                  audio: MetaMediaSchema.optional(),
                  video: MetaMediaSchema.optional(),
                  document: MetaMediaSchema.extend({ filename: z.string().optional() }).optional(),
                  sticker: MetaMediaSchema.optional(),
                  context: z.object({ from: z.string(), id: z.string() }).optional(),
                }),
              )
              .optional(),
          }),
        }),
      ),
    }),
  ),
});

type MetaMessage = z.infer<typeof MetaWebhookSchema>["entry"][number]["changes"][number]["value"]["messages"] extends
  | (infer M)[]
  | undefined
  ? M
  : never;

export interface ParsedMetaMessage {
  phoneNumberId: string;
  wabaId: string;
  from: string;
  to: string;
  contactName?: string;
  message: MetaMessage;
  raw: unknown;
}

/** Meta always sends full E.164 digits with no "+" — no missing-plus gotcha here. */
function normalizePhone(raw: string): E164 {
  return `+${raw.replace(/[^\d]/g, "")}` as E164;
}

/**
 * A single webhook call can batch multiple entries/changes/messages.
 * Status-only updates (delivered/read receipts) share the "messages" field
 * name but carry no `messages` array — they're skipped here, not raised as
 * errors, so the caller doesn't need to special-case them.
 */
export function parseMetaWebhook(payload: unknown): ParsedMetaMessage[] {
  const p = MetaWebhookSchema.parse(payload);
  const results: ParsedMetaMessage[] = [];

  for (const entry of p.entry) {
    for (const change of entry.changes) {
      const v = change.value;
      if (change.field !== "messages" || !v.messages) continue;
      for (const m of v.messages) {
        const contact = v.contacts?.find((c) => c.wa_id === m.from);
        results.push({
          phoneNumberId: v.metadata.phone_number_id,
          wabaId: entry.id,
          from: m.from,
          to: v.metadata.display_phone_number ?? "",
          contactName: contact?.profile?.name,
          message: m,
          raw: payload,
        });
      }
    }
  }
  return results;
}

export function toUnifiedEvent(parsed: ParsedMetaMessage, workspace: WorkspaceId): UnifiedInboundEvent {
  const m = parsed.message;
  const mediaNode = m.image ?? m.audio ?? m.video ?? m.document ?? m.sticker;
  const mediaKind = (["image", "audio", "video", "document", "sticker"] as const).find((k) => k === m.type);

  return {
    workspace,
    from: normalizePhone(parsed.from),
    to: normalizePhone(parsed.to),
    type: m.type as InboundType,
    text: m.text?.body ?? mediaNode?.caption,
    media:
      mediaNode && mediaKind
        ? {
            kind: mediaKind,
            id: mediaNode.id,
            mimeType: mediaNode.mime_type,
            caption: mediaNode.caption,
            sha256: mediaNode.sha256,
          }
        : undefined,
    contactName: parsed.contactName,
    ts: Number(m.timestamp) * 1000,
    wamid: m.id,
    contextWamid: m.context?.id,
    raw: parsed.raw,
  };
}
