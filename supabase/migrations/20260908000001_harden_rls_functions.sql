-- ============================================================
-- Hardening pass on the RLS helper functions (Supabase security
-- advisor warnings after the initial schema migration):
--   - function_search_path_mutable: pin search_path on every
--     SECURITY DEFINER / trigger function to stop schema hijacking.
--   - anon_security_definer_function_executable: these helpers
--     read auth.uid() and are only meaningful for signed-in users;
--     anon has no legitimate reason to call them directly via RPC.
-- ============================================================

alter function update_updated_at() set search_path = public, pg_temp;
alter function auth_workspace_ids() set search_path = public, pg_temp;
alter function auth_has_role(uuid, workspace_role[]) set search_path = public, pg_temp;

revoke execute on function auth_workspace_ids() from anon, public;
revoke execute on function auth_has_role(uuid, workspace_role[]) from anon, public;
grant execute on function auth_workspace_ids() to authenticated;
grant execute on function auth_has_role(uuid, workspace_role[]) to authenticated;
