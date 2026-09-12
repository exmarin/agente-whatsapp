-- ============================================================
-- Initial schema — Agente WhatsApp (Core v1)
-- Source of truth: docs/planeacion/BLUEPRINT-agente-whatsapp.md §3
-- Security posture: docs/planeacion/SECURITY-AUDIT-agente-whatsapp.md
--   SEC-02 (RLS on every tenant table, not just a sample) and
--   SEC-03 (encryption key custody OUTSIDE Postgres) are applied
--   from this first migration, not added later.
-- ============================================================

-- ============================================================
-- Extensions
-- ============================================================
create extension if not exists pgcrypto;   -- gen_random_uuid()
create extension if not exists vector;     -- pgvector: KB embeddings
create extension if not exists pg_trgm;    -- fuzzy search (name/phone)

-- ============================================================
-- updated_at trigger helper
-- ============================================================
create or replace function update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- ============================================================
-- Enums
-- ============================================================
create type conversation_state as enum (
  'ai_active', 'human_active', 'handoff_pending', 'waiting_reply', 'paused', 'closed'
);
create type conversation_channel as enum ('whatsapp');
create type message_direction as enum ('in', 'out');
create type message_type as enum (
  'text', 'audio', 'image', 'document', 'video', 'sticker', 'location', 'template', 'system'
);
create type message_status as enum ('queued', 'sent', 'delivered', 'read', 'failed');
create type batch_status as enum ('buffering', 'flushed', 'processed', 'cancelled');
create type template_status as enum ('draft', 'submitted', 'approved', 'rejected', 'paused');
create type prompt_version_state as enum ('draft', 'published');
create type prompt_scope as enum ('global', 'number', 'campaign', 'segment', 'mode');
create type workspace_role as enum ('admin', 'manager', 'agent', 'viewer');
create type contact_stage as enum ('new', 'engaged', 'qualified', 'customer', 'lost');
create type integration_provider as enum ('highlevel', 'openrouter', 'ycloud', 'caldotcom');
-- SEC-01: tool sensitivity classification — 'sensitive' tools require human confirmation by default
create type tool_sensitivity as enum ('read', 'write', 'sensitive');

-- ============================================================
-- Tenancy, users, permissions
-- ============================================================
create table workspaces (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text unique not null,
  logo_url text,
  settings jsonb default '{"timezone": "America/Mexico_City", "language": "es"}'::jsonb not null,
  is_active boolean default true not null,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);
create index idx_workspaces_slug on workspaces(slug);

create table users (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  email text not null,
  avatar_url text,
  is_active boolean default true not null,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

create table memberships (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  user_id uuid not null references users(id) on delete cascade,
  role workspace_role not null default 'agent',
  is_active boolean default true not null,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null,
  unique (workspace_id, user_id)
);
create index idx_memberships_workspace on memberships(workspace_id, is_active);
create index idx_memberships_user on memberships(user_id, is_active);

create table permissions (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  user_id uuid not null references users(id) on delete cascade,
  capability text not null,
  granted boolean default true not null,
  created_at timestamptz default now() not null,
  unique (workspace_id, user_id, capability)
);
create index idx_permissions_lookup on permissions(workspace_id, user_id);

-- ============================================================
-- RLS helpers (multi-tenant core)
-- ============================================================
create or replace function auth_workspace_ids()
returns setof uuid
language sql stable security definer as $$
  select m.workspace_id
  from memberships m
  where m.user_id = auth.uid() and m.is_active = true;
$$;

create or replace function auth_has_role(p_workspace uuid, p_roles workspace_role[])
returns boolean
language sql stable security definer as $$
  select exists (
    select 1 from memberships m
    where m.user_id = auth.uid()
      and m.workspace_id = p_workspace
      and m.is_active = true
      and m.role = any(p_roles)
  );
$$;

-- ============================================================
-- CRM: contacts
-- ============================================================
create table contacts (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  phone text not null,
  name text,
  email text,
  source text,
  owner_id uuid references users(id) on delete set null,
  stage contact_stage default 'new' not null,
  tags text[] default '{}'::text[] not null,
  custom_fields jsonb default '{}'::jsonb not null,
  opt_in boolean default false not null,
  opt_in_at timestamptz,
  hl_contact_id text,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null,
  constraint uq_contacts_workspace_phone unique (workspace_id, phone)
);
create index idx_contacts_workspace on contacts(workspace_id);
create index idx_contacts_owner on contacts(workspace_id, owner_id);
create index idx_contacts_stage on contacts(workspace_id, stage);
create index idx_contacts_hl on contacts(workspace_id, hl_contact_id) where hl_contact_id is not null;
create index idx_contacts_tags_gin on contacts using gin (tags);
create index idx_contacts_custom_fields_gin on contacts using gin (custom_fields jsonb_path_ops);
create index idx_contacts_name_trgm on contacts using gin (name gin_trgm_ops);
create trigger trg_contacts_updated_at before update on contacts for each row execute function update_updated_at();

-- ============================================================
-- Conversations, buffer, messages
-- ============================================================
create table conversations (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  contact_id uuid not null references contacts(id) on delete cascade,
  channel conversation_channel default 'whatsapp' not null,
  state conversation_state default 'ai_active' not null,
  ai_enabled boolean default true not null,
  assigned_to uuid references users(id) on delete set null,
  last_message_at timestamptz,
  window_expires_at timestamptz,
  unread_count int default 0 not null,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null,
  constraint uq_conversations_contact unique (workspace_id, contact_id, channel)
);
create index idx_conversations_workspace on conversations(workspace_id);
create index idx_conversations_inbox on conversations(workspace_id, last_message_at desc);
create index idx_conversations_state on conversations(workspace_id, state);
create index idx_conversations_assigned on conversations(workspace_id, assigned_to);
create trigger trg_conversations_updated_at before update on conversations for each row execute function update_updated_at();

create table message_batches (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  conversation_id uuid not null references conversations(id) on delete cascade,
  status batch_status default 'buffering' not null,
  silence_ms int not null default 12000,
  flush_at timestamptz,
  message_count int default 0 not null,
  merged_text text,
  meta jsonb default '{}'::jsonb not null,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);
create index idx_batches_conversation on message_batches(conversation_id, status);
create index idx_batches_flush on message_batches(status, flush_at) where status = 'buffering';
create trigger trg_batches_updated_at before update on message_batches for each row execute function update_updated_at();

create table messages (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  conversation_id uuid not null references conversations(id) on delete cascade,
  direction message_direction not null,
  type message_type not null default 'text',
  body text,
  media jsonb,
  wamid text,
  batch_id uuid references message_batches(id) on delete set null,
  template_id uuid,
  status message_status,
  error_message text,
  sender_user_id uuid references users(id) on delete set null,
  meta jsonb default '{}'::jsonb not null,
  created_at timestamptz default now() not null
);
create unique index uq_messages_wamid on messages(workspace_id, wamid) where wamid is not null;
create index idx_messages_conversation on messages(conversation_id, created_at desc);
create index idx_messages_workspace on messages(workspace_id, created_at desc);
create index idx_messages_batch on messages(batch_id) where batch_id is not null;
create index idx_messages_meta_gin on messages using gin (meta jsonb_path_ops);

alter publication supabase_realtime add table messages;
alter publication supabase_realtime add table conversations;
alter table messages replica identity full;
alter table conversations replica identity full;

-- ============================================================
-- Business info, prompts, versioning
-- ============================================================
create table business_info (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  structured jsonb default '{}'::jsonb not null,
  free_text text,
  updated_at timestamptz default now() not null,
  unique (workspace_id)
);
create index idx_business_info_structured_gin on business_info using gin (structured jsonb_path_ops);
create trigger trg_business_info_updated_at before update on business_info for each row execute function update_updated_at();

create table prompts (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  scope prompt_scope not null,
  scope_ref text,
  name text not null,
  active_version_id uuid,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null,
  unique (workspace_id, scope, scope_ref)
);
create index idx_prompts_workspace_scope on prompts(workspace_id, scope, scope_ref);

create table prompt_versions (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  prompt_id uuid not null references prompts(id) on delete cascade,
  version int not null,
  state prompt_version_state default 'draft' not null,
  body text not null,
  variables jsonb default '[]'::jsonb not null,
  model_overrides jsonb default '{}'::jsonb not null,
  guardrails jsonb default '{}'::jsonb not null,
  created_by uuid references users(id) on delete set null,
  published_at timestamptz,
  created_at timestamptz default now() not null,
  unique (prompt_id, version)
);
create index idx_prompt_versions_prompt on prompt_versions(prompt_id, state);

alter table prompts
  add constraint fk_prompts_active_version
  foreign key (active_version_id) references prompt_versions(id) on delete set null;

create trigger trg_prompts_updated_at before update on prompts for each row execute function update_updated_at();

-- ============================================================
-- Templates (Meta compliance — hard guardrail)
-- ============================================================
create table templates (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  name text not null,
  language text not null default 'es', -- "es", NEVER "es_PA" (YCloud/Meta gotcha)
  category text not null check (category in ('marketing', 'utility', 'authentication')),
  status template_status not null default 'draft',
  body_template text not null,
  components jsonb default '{}'::jsonb not null,
  variables jsonb default '[]'::jsonb not null,
  provider_template_id text,
  rejection_reason text,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null,
  unique (workspace_id, name, language)
);
create index idx_templates_workspace_status on templates(workspace_id, status);
create index idx_templates_components_gin on templates using gin (components jsonb_path_ops);
create trigger trg_templates_updated_at before update on templates for each row execute function update_updated_at();

alter table messages
  add constraint fk_messages_template
  foreign key (template_id) references templates(id) on delete set null;

-- ============================================================
-- Tools, integrations, Knowledge Base
--
-- SEC-03: `credentials` / `oauth_tokens` are opaque ciphertext JSONB
-- envelopes ({enc, iv, tag, key_id}) produced by the APPLICATION layer
-- (src/lib/crypto.ts) using ENCRYPTION_KEY from the server environment.
-- Postgres never sees the plaintext or the key — pgcrypto is NOT used
-- for this (a key stored in/passed to Postgres defeats the purpose).
-- ============================================================
create table tools (
  id uuid primary key default gen_random_uuid(),
  key text unique not null,
  name text not null,
  description text,
  sensitivity tool_sensitivity not null default 'read', -- SEC-01: 'sensitive' requires human confirmation by default
  schema jsonb default '{}'::jsonb not null,
  created_at timestamptz default now() not null
);

create table tool_configs (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  tool_id uuid not null references tools(id) on delete cascade,
  enabled boolean default false not null,
  credentials jsonb default '{}'::jsonb not null, -- ciphertext envelope, see note above
  config jsonb default '{}'::jsonb not null,
  require_confirmation boolean default true not null, -- SEC-01: default hard for 'sensitive' tools, enforced in app
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null,
  unique (workspace_id, tool_id)
);
create index idx_tool_configs_workspace on tool_configs(workspace_id, enabled);
create trigger trg_tool_configs_updated_at before update on tool_configs for each row execute function update_updated_at();

create table integrations (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  provider integration_provider not null,
  enabled boolean default false not null,
  credentials jsonb default '{}'::jsonb not null,   -- ciphertext envelope
  oauth_tokens jsonb default '{}'::jsonb not null,  -- ciphertext envelope (HighLevel access/refresh)
  config jsonb default '{}'::jsonb not null,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null,
  unique (workspace_id, provider)
);
create index idx_integrations_workspace on integrations(workspace_id, provider);
create trigger trg_integrations_updated_at before update on integrations for each row execute function update_updated_at();

create table kb_documents (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  title text not null,
  source_type text not null default 'doc' check (source_type in ('doc', 'faq', 'url', 'snippet')),
  source_url text,
  content text,
  meta jsonb default '{}'::jsonb not null,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);
create index idx_kb_documents_workspace on kb_documents(workspace_id);
create trigger trg_kb_documents_updated_at before update on kb_documents for each row execute function update_updated_at();

create table kb_chunks (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  document_id uuid not null references kb_documents(id) on delete cascade,
  chunk_index int not null,
  content text not null,
  embedding vector(1536),
  meta jsonb default '{}'::jsonb not null,
  created_at timestamptz default now() not null,
  unique (document_id, chunk_index)
);
create index idx_kb_chunks_workspace on kb_chunks(workspace_id);
create index idx_kb_chunks_document on kb_chunks(document_id);
create index idx_kb_chunks_embedding_hnsw on kb_chunks using hnsw (embedding vector_cosine_ops);

-- ============================================================
-- Setter, scheduling, observability
-- ============================================================
create table setter_configs (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  name text not null,
  enabled boolean default false not null,
  questions jsonb default '[]'::jsonb not null,
  knockout_rules jsonb default '[]'::jsonb not null,
  scoring jsonb default '{}'::jsonb not null,
  post_action jsonb default '{}'::jsonb not null,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null,
  unique (workspace_id, name)
);
create index idx_setter_configs_workspace on setter_configs(workspace_id, enabled);
create trigger trg_setter_configs_updated_at before update on setter_configs for each row execute function update_updated_at();

create table schedules (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  name text not null,
  mode text not null default 'external_link' check (mode in ('external_link', 'highlevel')),
  config jsonb default '{}'::jsonb not null,
  enabled boolean default true not null,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);
create index idx_schedules_workspace on schedules(workspace_id, enabled);
create trigger trg_schedules_updated_at before update on schedules for each row execute function update_updated_at();

create table appointments (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  contact_id uuid references contacts(id) on delete set null,
  conversation_id uuid references conversations(id) on delete set null,
  schedule_id uuid references schedules(id) on delete set null,
  scheduled_at timestamptz not null,
  status text not null default 'booked' check (status in ('booked', 'confirmed', 'cancelled', 'completed', 'no_show')),
  hl_appointment_id text,
  meta jsonb default '{}'::jsonb not null,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);
create index idx_appointments_workspace on appointments(workspace_id, scheduled_at);
create index idx_appointments_contact on appointments(contact_id);
create trigger trg_appointments_updated_at before update on appointments for each row execute function update_updated_at();

create table events (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  conversation_id uuid references conversations(id) on delete set null,
  type text not null,
  level text not null default 'info' check (level in ('debug', 'info', 'warn', 'error')),
  payload jsonb default '{}'::jsonb not null,
  created_at timestamptz default now() not null
);
create index idx_events_workspace on events(workspace_id, created_at desc);
create index idx_events_conversation on events(conversation_id, created_at desc);
create index idx_events_type on events(workspace_id, type, created_at desc);
create index idx_events_payload_gin on events using gin (payload jsonb_path_ops);

-- ============================================================
-- Row Level Security — EVERY tenant table, from this first migration
-- (SEC-02: the audit's "3 policies, rest follows the same pattern" gap
-- is what let secrets tables ship without RLS; we don't repeat that.)
-- ============================================================

-- workspaces: members read their own workspace; admins update it
alter table workspaces enable row level security;
create policy "member reads own workspace" on workspaces for select
  using (id in (select auth_workspace_ids()));
create policy "admin updates workspace" on workspaces for update
  using (auth_has_role(id, array['admin']::workspace_role[]))
  with check (auth_has_role(id, array['admin']::workspace_role[]));

-- users: a user manages only their own profile row
alter table users enable row level security;
create policy "self reads own profile" on users for select
  using (id = auth.uid());
create policy "self updates own profile" on users for update
  using (id = auth.uid()) with check (id = auth.uid());
create policy "self inserts own profile" on users for insert
  with check (id = auth.uid());

-- memberships: members read memberships of their workspaces; admins manage them
alter table memberships enable row level security;
create policy "member reads workspace memberships" on memberships for select
  using (workspace_id in (select auth_workspace_ids()));
create policy "admin manages memberships" on memberships for all
  using (auth_has_role(workspace_id, array['admin']::workspace_role[]))
  with check (auth_has_role(workspace_id, array['admin']::workspace_role[]));

-- permissions: admin-only (fine-grained overrides)
alter table permissions enable row level security;
create policy "admin manages permissions" on permissions for all
  using (auth_has_role(workspace_id, array['admin']::workspace_role[]))
  with check (auth_has_role(workspace_id, array['admin']::workspace_role[]));

-- contacts: members read; admin/manager/agent write
alter table contacts enable row level security;
create policy "ws members read contacts" on contacts for select
  using (workspace_id in (select auth_workspace_ids()));
create policy "ws operators write contacts" on contacts for all
  using (workspace_id in (select auth_workspace_ids())
    and auth_has_role(workspace_id, array['admin','manager','agent']::workspace_role[]))
  with check (workspace_id in (select auth_workspace_ids())
    and auth_has_role(workspace_id, array['admin','manager','agent']::workspace_role[]));

-- conversations: members read; admin/manager update any, agent updates only if assigned
alter table conversations enable row level security;
create policy "ws members read conversations" on conversations for select
  using (workspace_id in (select auth_workspace_ids()));
create policy "ws agents update conversations" on conversations for update
  using (workspace_id in (select auth_workspace_ids())
    and (auth_has_role(workspace_id, array['admin','manager']::workspace_role[]) or assigned_to = auth.uid()))
  with check (workspace_id in (select auth_workspace_ids()));
create policy "service inserts conversations" on conversations for insert
  with check (workspace_id in (select auth_workspace_ids())
    and auth_has_role(workspace_id, array['admin','manager','agent']::workspace_role[]));

-- message_batches: only admin/manager can read (observability); writes are server-side (service_role bypasses RLS)
alter table message_batches enable row level security;
create policy "managers read batches" on message_batches for select
  using (auth_has_role(workspace_id, array['admin','manager']::workspace_role[]));

-- messages: members read; outbound insert restricted to operators, direction='out' only
-- (inbound + status updates are written by the webhook via service_role, which bypasses RLS)
alter table messages enable row level security;
create policy "ws members read messages" on messages for select
  using (workspace_id in (select auth_workspace_ids()));
create policy "ws agents send messages" on messages for insert
  with check (workspace_id in (select auth_workspace_ids())
    and direction = 'out'
    and auth_has_role(workspace_id, array['admin','manager','agent']::workspace_role[]));

-- business_info: members read; admin/manager write
alter table business_info enable row level security;
create policy "ws members read business_info" on business_info for select
  using (workspace_id in (select auth_workspace_ids()));
create policy "ws managers write business_info" on business_info for all
  using (workspace_id in (select auth_workspace_ids())
    and auth_has_role(workspace_id, array['admin','manager']::workspace_role[]))
  with check (workspace_id in (select auth_workspace_ids())
    and auth_has_role(workspace_id, array['admin','manager']::workspace_role[]));

-- prompts / prompt_versions: members read; admin/manager write
alter table prompts enable row level security;
create policy "ws members read prompts" on prompts for select
  using (workspace_id in (select auth_workspace_ids()));
create policy "ws managers write prompts" on prompts for all
  using (workspace_id in (select auth_workspace_ids())
    and auth_has_role(workspace_id, array['admin','manager']::workspace_role[]))
  with check (workspace_id in (select auth_workspace_ids())
    and auth_has_role(workspace_id, array['admin','manager']::workspace_role[]));

alter table prompt_versions enable row level security;
create policy "ws members read prompt_versions" on prompt_versions for select
  using (workspace_id in (select auth_workspace_ids()));
create policy "ws managers write prompt_versions" on prompt_versions for all
  using (workspace_id in (select auth_workspace_ids())
    and auth_has_role(workspace_id, array['admin','manager']::workspace_role[]))
  with check (workspace_id in (select auth_workspace_ids())
    and auth_has_role(workspace_id, array['admin','manager']::workspace_role[]));

-- templates: members read; admin/manager write
alter table templates enable row level security;
create policy "ws members read templates" on templates for select
  using (workspace_id in (select auth_workspace_ids()));
create policy "ws managers write templates" on templates for all
  using (workspace_id in (select auth_workspace_ids())
    and auth_has_role(workspace_id, array['admin','manager']::workspace_role[]))
  with check (workspace_id in (select auth_workspace_ids())
    and auth_has_role(workspace_id, array['admin','manager']::workspace_role[]));

-- tools: global catalog, read-only for any authenticated member; writes are service_role/admin-console only
alter table tools enable row level security;
create policy "authenticated reads tools catalog" on tools for select
  using (auth.role() = 'authenticated');

-- tool_configs: SEC-02 — admin/manager only, since it carries encrypted credentials
alter table tool_configs enable row level security;
create policy "ws managers read tool_configs" on tool_configs for select
  using (auth_has_role(workspace_id, array['admin','manager']::workspace_role[]));
create policy "ws admin writes tool_configs" on tool_configs for all
  using (auth_has_role(workspace_id, array['admin']::workspace_role[]))
  with check (auth_has_role(workspace_id, array['admin']::workspace_role[]));

-- integrations: SEC-02 — admin/manager only, since it carries encrypted credentials/oauth tokens
alter table integrations enable row level security;
create policy "ws managers read integrations" on integrations for select
  using (auth_has_role(workspace_id, array['admin','manager']::workspace_role[]));
create policy "ws admin writes integrations" on integrations for all
  using (auth_has_role(workspace_id, array['admin']::workspace_role[]))
  with check (auth_has_role(workspace_id, array['admin']::workspace_role[]));

-- kb_documents / kb_chunks: members read; admin/manager write
-- (SCALE-02: every semantic-search query MUST filter by workspace_id server-side —
-- RLS here is the second layer, not the only one; see the future match RPC.)
alter table kb_documents enable row level security;
create policy "ws members read kb_documents" on kb_documents for select
  using (workspace_id in (select auth_workspace_ids()));
create policy "ws managers write kb_documents" on kb_documents for all
  using (workspace_id in (select auth_workspace_ids())
    and auth_has_role(workspace_id, array['admin','manager']::workspace_role[]))
  with check (workspace_id in (select auth_workspace_ids())
    and auth_has_role(workspace_id, array['admin','manager']::workspace_role[]));

alter table kb_chunks enable row level security;
create policy "ws members read kb_chunks" on kb_chunks for select
  using (workspace_id in (select auth_workspace_ids()));
create policy "ws managers write kb_chunks" on kb_chunks for all
  using (workspace_id in (select auth_workspace_ids())
    and auth_has_role(workspace_id, array['admin','manager']::workspace_role[]))
  with check (workspace_id in (select auth_workspace_ids())
    and auth_has_role(workspace_id, array['admin','manager']::workspace_role[]));

-- setter_configs: members read; admin/manager write
alter table setter_configs enable row level security;
create policy "ws members read setter_configs" on setter_configs for select
  using (workspace_id in (select auth_workspace_ids()));
create policy "ws managers write setter_configs" on setter_configs for all
  using (workspace_id in (select auth_workspace_ids())
    and auth_has_role(workspace_id, array['admin','manager']::workspace_role[]))
  with check (workspace_id in (select auth_workspace_ids())
    and auth_has_role(workspace_id, array['admin','manager']::workspace_role[]));

-- schedules: members read; admin/manager write
alter table schedules enable row level security;
create policy "ws members read schedules" on schedules for select
  using (workspace_id in (select auth_workspace_ids()));
create policy "ws managers write schedules" on schedules for all
  using (workspace_id in (select auth_workspace_ids())
    and auth_has_role(workspace_id, array['admin','manager']::workspace_role[]))
  with check (workspace_id in (select auth_workspace_ids())
    and auth_has_role(workspace_id, array['admin','manager']::workspace_role[]));

-- appointments: members read; admin/manager/agent write
alter table appointments enable row level security;
create policy "ws members read appointments" on appointments for select
  using (workspace_id in (select auth_workspace_ids()));
create policy "ws operators write appointments" on appointments for all
  using (workspace_id in (select auth_workspace_ids())
    and auth_has_role(workspace_id, array['admin','manager','agent']::workspace_role[]))
  with check (workspace_id in (select auth_workspace_ids())
    and auth_has_role(workspace_id, array['admin','manager','agent']::workspace_role[]));

-- events: admin/manager only (costs, logs, tool-call traces)
alter table events enable row level security;
create policy "ws managers read events" on events for select
  using (auth_has_role(workspace_id, array['admin','manager']::workspace_role[]));

-- ============================================================
-- Seed: global tools catalog (Core v1 — see Blueprint §4.5.4)
-- Disabled by default per workspace via tool_configs; sensitivity
-- drives whether human confirmation is required (SEC-01).
-- ============================================================
insert into tools (key, name, description, sensitivity) values
  ('send_whatsapp_text', 'Enviar texto WhatsApp', 'Enviar texto libre dentro de la ventana de 24h', 'write'),
  ('send_whatsapp_template', 'Enviar template WhatsApp', 'Enviar template aprobado fuera de la ventana de 24h', 'write'),
  ('tag_contact', 'Etiquetar contacto', 'Etiquetar contacto/conversación', 'write'),
  ('update_contact_stage', 'Actualizar etapa CRM', 'Mover la etapa del pipeline del contacto', 'write'),
  ('request_human_handoff', 'Escalar a humano', 'Escalar la conversación a un humano', 'write'),
  ('highlevel_upsert_contact', 'Crear/actualizar contacto HighLevel', 'Crear o actualizar un contacto en HighLevel', 'sensitive'),
  ('highlevel_create_opportunity', 'Crear oportunidad HighLevel', 'Crear una oportunidad/deal en HighLevel', 'sensitive'),
  ('book_appointment', 'Agendar cita', 'Agendar una cita vía HighLevel o Cal.com', 'sensitive'),
  ('search_knowledge_base', 'Buscar en base de conocimiento', 'Búsqueda semántica sobre la KB del workspace', 'read'),
  ('apply_setter_step', 'Avanzar flujo setter', 'Avanzar el flujo de calificación (preguntas/knockout/score)', 'write'),
  ('custom_webhook', 'Webhook personalizado', 'Dispara un webhook externo configurado por el workspace', 'sensitive');
