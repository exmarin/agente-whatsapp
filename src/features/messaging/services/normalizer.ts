import { z } from "zod";
import type { E164, InboundType, UnifiedInboundEvent, WorkspaceId } from "../types";

/** Confirmed real shape of `whatsappInboundMessage` — Blueprint §4.1.3 / §5.A. */
const YCloudInboundSchema = z.object({
  type: z.literal("whatsapp.inbound_message.received"),
  id: z.string(),
  createTime: z.string(),
  whatsappInboundMessage: z.object({
    id: z.string(),
    wamid: z.string(),
    wabaId: z.string().optional(),
    from: z.string(),
    to: z.string(),
    sendTime: z.string().optional(),
    customerProfile: z.object({ name: z.string().optional() }).optional(),
    type: z.string(),
    text: z.object({ body: z.string() }).optional(),
    image: z
      .object({
        link: z.string(),
        caption: z.string().optional(),
        mime_type: z.string().optional(),
        sha256: z.string().optional(),
      })
      .optional(),
    audio: z
      .object({ link: z.string(), mime_type: z.string().optional(), sha256: z.string().optional() })
      .optional(),
    video: z
      .object({ link: z.string(), caption: z.string().optional(), mime_type: z.string().optional() })
      .optional(),
    document: z
      .object({ link: z.string(), filename: z.string().optional(), caption: z.string().optional() })
      .optional(),
    context: z.object({ from: z.string(), id: z.string() }).optional(),
  }),
});

/** Gotcha (confirmed in production): the phone sometimes arrives without "+". */
export function normalizePhone(raw: string, defaultCountry: string): E164 {
  const digits = raw.replace(/[^\d+]/g, "");
  if (digits.startsWith("+")) return digits as E164;
  return `+${defaultCountry}${digits}` as E164;
}

export function parseYCloudInbound(payload: unknown) {
  return YCloudInboundSchema.parse(payload);
}

export function normalizeInbound(
  payload: unknown,
  workspace: WorkspaceId,
  defaultCountry: string,
): UnifiedInboundEvent {
  const p = parseYCloudInbound(payload);
  const m = p.whatsappInboundMessage;
  const mediaNode = m.image ?? m.audio ?? m.video ?? m.document;

  return {
    workspace,
    from: normalizePhone(m.from, defaultCountry),
    to: normalizePhone(m.to, defaultCountry),
    type: m.type as InboundType,
    text: m.text?.body ?? (mediaNode as { caption?: string } | undefined)?.caption,
    media: mediaNode
      ? {
          kind: m.type as never,
          link: mediaNode.link,
          mimeType: (mediaNode as { mime_type?: string }).mime_type,
          caption: (mediaNode as { caption?: string }).caption,
          sha256: (mediaNode as { sha256?: string }).sha256,
        }
      : undefined,
    contactName: m.customerProfile?.name,
    ts: m.sendTime ? Date.parse(m.sendTime) : Date.now(),
    wamid: m.wamid,
    contextWamid: m.context?.id,
    raw: payload,
  };
}
