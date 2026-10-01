import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendNotificationEmail } from "./email";

/**
 * Best-effort: a notification failing (missing RESEND_API_KEY, Resend
 * outage, etc.) must never break the inbound message pipeline that calls
 * this — swallow and log instead of throwing.
 */
export async function notifyTeam(workspaceId: string, subject: string, text: string): Promise<void> {
  const supabase = createAdminClient();

  const { data: workspace } = await supabase.from("workspaces").select("name, settings").eq("id", workspaceId).single();
  const emails = (workspace?.settings as { notification_emails?: string[] } | null)?.notification_emails ?? [];
  if (emails.length === 0) return;

  try {
    await sendNotificationEmail({
      to: emails,
      subject: `[${workspace?.name ?? "Agente WhatsApp"}] ${subject}`,
      text,
    });
  } catch (error) {
    await supabase.from("events").insert({
      workspace_id: workspaceId,
      type: "send_error",
      level: "error",
      payload: { reason: "notification_email_failed", message: error instanceof Error ? error.message : String(error) },
    });
  }
}
