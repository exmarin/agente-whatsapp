export type WorkspaceId = string;

/** E.164 phone number — always includes "+" and country code. */
export type E164 = string;

export type InboundType =
  | "text"
  | "audio"
  | "image"
  | "video"
  | "document"
  | "sticker"
  | "interactive";

/** The only shape the rest of the runtime knows — see Blueprint §4.1. */
export interface UnifiedInboundEvent {
  workspace: WorkspaceId;
  from: E164;
  to: E164;
  type: InboundType;
  text?: string;
  media?: {
    kind: "audio" | "image" | "video" | "document" | "sticker";
    link: string;
    mimeType?: string;
    caption?: string;
    sha256?: string;
  };
  contactName?: string;
  ts: number;
  wamid: string;
  contextWamid?: string;
  raw: unknown;
}
