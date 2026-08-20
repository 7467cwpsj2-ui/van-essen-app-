-- Bewijsfoto's per maatregel in de subsidiecheck, zodat het
-- subsidiedocument niet alleen een berekening is maar ook meteen de
-- foto's bevat die RVO bij een aanvraag verwacht (bv. tijdens de
-- uitvoering, of van het typeplaatje). Bewust een los tabelletje i.p.v.
-- de bestaande photos-tabel hergebruiken: die is gebouwd rond de
-- voor/tijdens/na-projectverhaallijn, niet rond losse maatregelen, en
-- deze foto's horen specifiek bij één subsidieregel.
create table if not exists subsidy_check_item_photos (
  id uuid primary key default gen_random_uuid(),
  check_item_id uuid not null references subsidy_check_items(id) on delete cascade,
  project_id uuid not null references projects(id) on delete cascade,
  file_path text not null,
  caption text,
  uploaded_by text,
  created_at timestamptz not null default now()
);

alter table subsidy_check_item_photos enable row level security;

create policy subsidy_check_item_photos_all on subsidy_check_item_photos
  for all using (has_project_access(project_id) and current_profile_role() <> 'klant')
  with check (has_project_access(project_id) and current_profile_role() <> 'klant');

create index if not exists subsidy_check_item_photos_item_id_idx on subsidy_check_item_photos(check_item_id);
