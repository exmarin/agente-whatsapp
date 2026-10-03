import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { downloadMedia, resolveMediaUrl } from "./meta-client";

export const MEDIA_BUCKET = "media";

/**
 * Downloads an inbound WhatsApp media file (via its Meta media ID) and
 * stores it in Supabase Storage under `{workspaceId}/{mediaId}`. Uses the
 * admin client — same as every other write in the inbound pipeline — RLS
 * on `storage.objects` only needs to allow reads for the signed-URL path.
 */
export async function storeInboundMedia(args: {
  workspaceId: string;
  mediaId: string;
  accessToken: string;
}): Promise<{ path: string; mimeType: string }> {
  const resolved = await resolveMediaUrl(args.mediaId, args.accessToken);
  const bytes = await downloadMedia(resolved.url, args.accessToken);

  const path = `${args.workspaceId}/${args.mediaId}`;
  const supabase = createAdminClient();
  const { error } = await supabase.storage.from(MEDIA_BUCKET).upload(path, Buffer.from(bytes), {
    contentType: resolved.mimeType,
    upsert: true,
  });
  if (error) throw error;

  return { path, mimeType: resolved.mimeType };
}
