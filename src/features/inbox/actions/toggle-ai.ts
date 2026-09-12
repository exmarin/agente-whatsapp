"use server";

import { revalidatePath } from "next/cache";
import { verifySession } from "@/lib/supabase/dal";

export async function toggleAi(conversationId: string, aiEnabled: boolean) {
  const { supabase } = await verifySession();

  const { error } = await supabase
    .from("conversations")
    .update({ ai_enabled: aiEnabled })
    .eq("id", conversationId);
  if (error) throw error;

  revalidatePath(`/inbox/${conversationId}`);
}
