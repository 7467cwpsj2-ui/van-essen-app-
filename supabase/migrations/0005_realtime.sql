-- Zet Postgres Changes (Supabase Realtime) aan voor chat, meerwerk en
-- opleverpunten, zodat de app live bijwerkt zonder handmatig verversen.
-- Realtime respecteert dezelfde RLS-policies als gewone queries — een
-- gebruiker ontvangt dus alleen wijzigingen op rijen die hij toch al
-- mocht zien.

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'chat_messages'
  ) then
    alter publication supabase_realtime add table chat_messages;
  end if;

  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'owner_client_messages'
  ) then
    alter publication supabase_realtime add table owner_client_messages;
  end if;

  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'extra_work'
  ) then
    alter publication supabase_realtime add table extra_work;
  end if;

  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'completion_points'
  ) then
    alter publication supabase_realtime add table completion_points;
  end if;
end $$;
