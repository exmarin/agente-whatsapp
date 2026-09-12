-- ============================================================
-- Performance hardening after the initial schema (advisor WARN/INFO):
--   1. auth_rls_initplan: wrap auth.uid()/auth.role() in (select ...)
--      so Postgres evaluates them once per query, not once per row.
--   2. multiple_permissive_policies: tables that had both a dedicated
--      SELECT policy and a `for all` write policy got two permissive
--      policies evaluated per SELECT. Split `for all` into
--      insert/update/delete so SELECT has exactly one policy.
--   3. unindexed_foreign_keys: add covering indexes for FK columns
--      flagged by the advisor.
-- ============================================================

-- ----- 1. auth_rls_initplan -----

drop policy "self reads own profile" on users;
create policy "self reads own profile" on users for select
  using (id = (select auth.uid()));

drop policy "self updates own profile" on users;
create policy "self updates own profile" on users for update
  using (id = (select auth.uid())) with check (id = (select auth.uid()));

drop policy "self inserts own profile" on users;
create policy "self inserts own profile" on users for insert
  with check (id = (select auth.uid()));

drop policy "ws agents update conversations" on conversations;
create policy "ws agents update conversations" on conversations for update
  using (workspace_id in (select auth_workspace_ids())
    and (auth_has_role(workspace_id, array['admin','manager']::workspace_role[]) or assigned_to = (select auth.uid())))
  with check (workspace_id in (select auth_workspace_ids()));

drop policy "authenticated reads tools catalog" on tools;
create policy "authenticated reads tools catalog" on tools for select
  using ((select auth.role()) = 'authenticated');

-- ----- 2. multiple_permissive_policies: split `for all` write policies -----

drop policy "admin manages memberships" on memberships;
create policy "admin inserts memberships" on memberships for insert
  with check (auth_has_role(workspace_id, array['admin']::workspace_role[]));
create policy "admin updates memberships" on memberships for update
  using (auth_has_role(workspace_id, array['admin']::workspace_role[]))
  with check (auth_has_role(workspace_id, array['admin']::workspace_role[]));
create policy "admin deletes memberships" on memberships for delete
  using (auth_has_role(workspace_id, array['admin']::workspace_role[]));

drop policy "ws operators write contacts" on contacts;
create policy "ws operators insert contacts" on contacts for insert
  with check (workspace_id in (select auth_workspace_ids())
    and auth_has_role(workspace_id, array['admin','manager','agent']::workspace_role[]));
create policy "ws operators update contacts" on contacts for update
  using (workspace_id in (select auth_workspace_ids())
    and auth_has_role(workspace_id, array['admin','manager','agent']::workspace_role[]))
  with check (workspace_id in (select auth_workspace_ids())
    and auth_has_role(workspace_id, array['admin','manager','agent']::workspace_role[]));
create policy "ws operators delete contacts" on contacts for delete
  using (workspace_id in (select auth_workspace_ids())
    and auth_has_role(workspace_id, array['admin','manager','agent']::workspace_role[]));

drop policy "ws managers write business_info" on business_info;
create policy "ws managers insert business_info" on business_info for insert
  with check (workspace_id in (select auth_workspace_ids())
    and auth_has_role(workspace_id, array['admin','manager']::workspace_role[]));
create policy "ws managers update business_info" on business_info for update
  using (workspace_id in (select auth_workspace_ids())
    and auth_has_role(workspace_id, array['admin','manager']::workspace_role[]))
  with check (workspace_id in (select auth_workspace_ids())
    and auth_has_role(workspace_id, array['admin','manager']::workspace_role[]));
create policy "ws managers delete business_info" on business_info for delete
  using (workspace_id in (select auth_workspace_ids())
    and auth_has_role(workspace_id, array['admin','manager']::workspace_role[]));

drop policy "ws managers write prompts" on prompts;
create policy "ws managers insert prompts" on prompts for insert
  with check (workspace_id in (select auth_workspace_ids())
    and auth_has_role(workspace_id, array['admin','manager']::workspace_role[]));
create policy "ws managers update prompts" on prompts for update
  using (workspace_id in (select auth_workspace_ids())
    and auth_has_role(workspace_id, array['admin','manager']::workspace_role[]))
  with check (workspace_id in (select auth_workspace_ids())
    and auth_has_role(workspace_id, array['admin','manager']::workspace_role[]));
create policy "ws managers delete prompts" on prompts for delete
  using (workspace_id in (select auth_workspace_ids())
    and auth_has_role(workspace_id, array['admin','manager']::workspace_role[]));

drop policy "ws managers write prompt_versions" on prompt_versions;
create policy "ws managers insert prompt_versions" on prompt_versions for insert
  with check (workspace_id in (select auth_workspace_ids())
    and auth_has_role(workspace_id, array['admin','manager']::workspace_role[]));
create policy "ws managers update prompt_versions" on prompt_versions for update
  using (workspace_id in (select auth_workspace_ids())
    and auth_has_role(workspace_id, array['admin','manager']::workspace_role[]))
  with check (workspace_id in (select auth_workspace_ids())
    and auth_has_role(workspace_id, array['admin','manager']::workspace_role[]));
create policy "ws managers delete prompt_versions" on prompt_versions for delete
  using (workspace_id in (select auth_workspace_ids())
    and auth_has_role(workspace_id, array['admin','manager']::workspace_role[]));

drop policy "ws managers write templates" on templates;
create policy "ws managers insert templates" on templates for insert
  with check (workspace_id in (select auth_workspace_ids())
    and auth_has_role(workspace_id, array['admin','manager']::workspace_role[]));
create policy "ws managers update templates" on templates for update
  using (workspace_id in (select auth_workspace_ids())
    and auth_has_role(workspace_id, array['admin','manager']::workspace_role[]))
  with check (workspace_id in (select auth_workspace_ids())
    and auth_has_role(workspace_id, array['admin','manager']::workspace_role[]));
create policy "ws managers delete templates" on templates for delete
  using (workspace_id in (select auth_workspace_ids())
    and auth_has_role(workspace_id, array['admin','manager']::workspace_role[]));

drop policy "ws admin writes tool_configs" on tool_configs;
create policy "ws admin inserts tool_configs" on tool_configs for insert
  with check (auth_has_role(workspace_id, array['admin']::workspace_role[]));
create policy "ws admin updates tool_configs" on tool_configs for update
  using (auth_has_role(workspace_id, array['admin']::workspace_role[]))
  with check (auth_has_role(workspace_id, array['admin']::workspace_role[]));
create policy "ws admin deletes tool_configs" on tool_configs for delete
  using (auth_has_role(workspace_id, array['admin']::workspace_role[]));

drop policy "ws admin writes integrations" on integrations;
create policy "ws admin inserts integrations" on integrations for insert
  with check (auth_has_role(workspace_id, array['admin']::workspace_role[]));
create policy "ws admin updates integrations" on integrations for update
  using (auth_has_role(workspace_id, array['admin']::workspace_role[]))
  with check (auth_has_role(workspace_id, array['admin']::workspace_role[]));
create policy "ws admin deletes integrations" on integrations for delete
  using (auth_has_role(workspace_id, array['admin']::workspace_role[]));

drop policy "ws managers write kb_documents" on kb_documents;
create policy "ws managers insert kb_documents" on kb_documents for insert
  with check (workspace_id in (select auth_workspace_ids())
    and auth_has_role(workspace_id, array['admin','manager']::workspace_role[]));
create policy "ws managers update kb_documents" on kb_documents for update
  using (workspace_id in (select auth_workspace_ids())
    and auth_has_role(workspace_id, array['admin','manager']::workspace_role[]))
  with check (workspace_id in (select auth_workspace_ids())
    and auth_has_role(workspace_id, array['admin','manager']::workspace_role[]));
create policy "ws managers delete kb_documents" on kb_documents for delete
  using (workspace_id in (select auth_workspace_ids())
    and auth_has_role(workspace_id, array['admin','manager']::workspace_role[]));

drop policy "ws managers write kb_chunks" on kb_chunks;
create policy "ws managers insert kb_chunks" on kb_chunks for insert
  with check (workspace_id in (select auth_workspace_ids())
    and auth_has_role(workspace_id, array['admin','manager']::workspace_role[]));
create policy "ws managers update kb_chunks" on kb_chunks for update
  using (workspace_id in (select auth_workspace_ids())
    and auth_has_role(workspace_id, array['admin','manager']::workspace_role[]))
  with check (workspace_id in (select auth_workspace_ids())
    and auth_has_role(workspace_id, array['admin','manager']::workspace_role[]));
create policy "ws managers delete kb_chunks" on kb_chunks for delete
  using (workspace_id in (select auth_workspace_ids())
    and auth_has_role(workspace_id, array['admin','manager']::workspace_role[]));

drop policy "ws managers write setter_configs" on setter_configs;
create policy "ws managers insert setter_configs" on setter_configs for insert
  with check (workspace_id in (select auth_workspace_ids())
    and auth_has_role(workspace_id, array['admin','manager']::workspace_role[]));
create policy "ws managers update setter_configs" on setter_configs for update
  using (workspace_id in (select auth_workspace_ids())
    and auth_has_role(workspace_id, array['admin','manager']::workspace_role[]))
  with check (workspace_id in (select auth_workspace_ids())
    and auth_has_role(workspace_id, array['admin','manager']::workspace_role[]));
create policy "ws managers delete setter_configs" on setter_configs for delete
  using (workspace_id in (select auth_workspace_ids())
    and auth_has_role(workspace_id, array['admin','manager']::workspace_role[]));

drop policy "ws managers write schedules" on schedules;
create policy "ws managers insert schedules" on schedules for insert
  with check (workspace_id in (select auth_workspace_ids())
    and auth_has_role(workspace_id, array['admin','manager']::workspace_role[]));
create policy "ws managers update schedules" on schedules for update
  using (workspace_id in (select auth_workspace_ids())
    and auth_has_role(workspace_id, array['admin','manager']::workspace_role[]))
  with check (workspace_id in (select auth_workspace_ids())
    and auth_has_role(workspace_id, array['admin','manager']::workspace_role[]));
create policy "ws managers delete schedules" on schedules for delete
  using (workspace_id in (select auth_workspace_ids())
    and auth_has_role(workspace_id, array['admin','manager']::workspace_role[]));

drop policy "ws operators write appointments" on appointments;
create policy "ws operators insert appointments" on appointments for insert
  with check (workspace_id in (select auth_workspace_ids())
    and auth_has_role(workspace_id, array['admin','manager','agent']::workspace_role[]));
create policy "ws operators update appointments" on appointments for update
  using (workspace_id in (select auth_workspace_ids())
    and auth_has_role(workspace_id, array['admin','manager','agent']::workspace_role[]))
  with check (workspace_id in (select auth_workspace_ids())
    and auth_has_role(workspace_id, array['admin','manager','agent']::workspace_role[]));
create policy "ws operators delete appointments" on appointments for delete
  using (workspace_id in (select auth_workspace_ids())
    and auth_has_role(workspace_id, array['admin','manager','agent']::workspace_role[]));

-- ----- 3. unindexed_foreign_keys -----

create index idx_appointments_conversation_fk on appointments(conversation_id);
create index idx_appointments_schedule_fk on appointments(schedule_id);
create index idx_contacts_owner_fk on contacts(owner_id);
create index idx_conversations_assigned_fk on conversations(assigned_to);
create index idx_conversations_contact_fk on conversations(contact_id);
create index idx_message_batches_workspace_fk on message_batches(workspace_id);
create index idx_messages_template_fk on messages(template_id);
create index idx_messages_sender_fk on messages(sender_user_id);
create index idx_permissions_user_fk on permissions(user_id);
create index idx_prompt_versions_created_by_fk on prompt_versions(created_by);
create index idx_prompt_versions_workspace_fk on prompt_versions(workspace_id);
create index idx_prompts_active_version_fk on prompts(active_version_id);
create index idx_tool_configs_tool_fk on tool_configs(tool_id);
