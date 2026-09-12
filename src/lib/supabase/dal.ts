import "server-only";
import { redirect } from "next/navigation";
import { cache } from "react";
import { createClient } from "./server";

/**
 * Optimistic check already happened in src/proxy.ts. This is the real,
 * per-request check — call it at the top of any protected Server Component
 * or Server Action. cache() dedupes it within a single render pass.
 */
export const verifySession = cache(async () => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  return { user, supabase };
});
