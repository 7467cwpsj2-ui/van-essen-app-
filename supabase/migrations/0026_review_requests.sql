-- App-brede instellingen (nu alleen de Google-reviewlink) — singleton
-- tabel via de klassieke "boolean primary key + check" truc, zodat er
-- altijd precies één rij bestaat.
create table if not exists app_settings (
  id boolean primary key default true,
  google_review_url text,
  check (id)
);
insert into app_settings (id) values (true) on conflict (id) do nothing;

alter table app_settings enable row level security;
create policy app_settings_select on app_settings for select using (is_owner());
create policy app_settings_update on app_settings for update using (is_owner()) with check (is_owner());

-- Voorkomt dat de automatische review-aanvraag na oplevering dubbel
-- verstuurd wordt.
alter table projects add column if not exists review_request_sent_at timestamptz;
