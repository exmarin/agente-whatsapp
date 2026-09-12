import { createClient } from "@supabase/supabase-js";
import "server-only";
import type { Database } from "./database.types";

/**
 * service_role client — bypasses RLS. Only for trusted server-side paths
 * that must act across tenants before an authenticated user context exists
 * (the YCloud webhook, the future buffer worker). Never import this into
 * anything reachable from a Client Component.
 */
export function createAdminClient() {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
}
