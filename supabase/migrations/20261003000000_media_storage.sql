-- Private bucket for inbound WhatsApp media (images, audio, video, documents).
-- Objects are stored under `{workspace_id}/{meta_media_id}`; RLS restricts
-- reads to members of that workspace, same tenancy pattern as every other
-- table. Writes happen only via the admin client (service_role bypasses
-- RLS), same as the rest of the inbound pipeline.
insert into storage.buckets (id, name, public)
values ('media', 'media', false)
on conflict (id) do nothing;

create policy "workspace members read own media" on storage.objects for select
  using (
    bucket_id = 'media'
    and (storage.foldername(name))[1]::uuid in (select auth_workspace_ids())
  );
