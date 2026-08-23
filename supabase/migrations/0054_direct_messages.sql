-- Rechtstreeks bericht tussen eigenaar en één teamlid/onderaannemer, los
-- van een specifiek project — vervangt WhatsApp-contact met (onder)
-- aannemers door een kanaal binnen de app zelf. Eén doorlopend gesprek
-- per teamlid, niet versnipperd per project, want een onderaannemer
-- werkt vaak aan meerdere projecten tegelijk.
create table direct_messages (
  id uuid primary key default gen_random_uuid(),
  team_member_id uuid not null references team_members(id) on delete cascade,
  author_id uuid references auth.users(id),
  author_name text,
  text text not null default '',
  file_path text,
  file_type text check (file_type in ('image', 'pdf')),
  read_by_owner boolean not null default false,
  read_by_member boolean not null default false,
  created_at timestamptz not null default now()
);

alter table direct_messages enable row level security;

create policy direct_messages_select on direct_messages for select
  using (
    is_owner()
    or (current_profile_role() = 'team' and team_member_id = current_team_member_id())
  );
create policy direct_messages_insert on direct_messages for insert
  with check (
    (
      is_owner()
      or (current_profile_role() = 'team' and team_member_id = current_team_member_id())
    )
    and author_id = auth.uid()
  );
create policy direct_messages_update on direct_messages for update
  using (
    is_owner()
    or (current_profile_role() = 'team' and team_member_id = current_team_member_id())
  )
  with check (
    is_owner()
    or (current_profile_role() = 'team' and team_member_id = current_team_member_id())
  );
create policy direct_messages_delete on direct_messages for delete
  using (is_owner() or author_id = auth.uid());

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'direct_messages'
  ) then
    alter publication supabase_realtime add table direct_messages;
  end if;
end $$;

-- Eigen bucket i.p.v. project-files: dat verwacht een project-id als
-- eerste mappadeel (has_project_access parseert die), en dit kanaal
-- staat juist los van projecten. Hier is het teamlid-id het eerste
-- mappadeel.
insert into storage.buckets (id, name, public)
values ('team-messages', 'team-messages', false)
on conflict (id) do nothing;

create policy team_messages_files_select on storage.objects for select
  using (
    bucket_id = 'team-messages'
    and (
      is_owner()
      or (current_profile_role() = 'team' and (storage.foldername(name))[1]::uuid = current_team_member_id())
    )
  );
create policy team_messages_files_insert on storage.objects for insert
  with check (
    bucket_id = 'team-messages'
    and (
      is_owner()
      or (current_profile_role() = 'team' and (storage.foldername(name))[1]::uuid = current_team_member_id())
    )
  );
create policy team_messages_files_delete on storage.objects for delete
  using (
    bucket_id = 'team-messages'
    and (
      is_owner()
      or (current_profile_role() = 'team' and (storage.foldername(name))[1]::uuid = current_team_member_id())
    )
  );
