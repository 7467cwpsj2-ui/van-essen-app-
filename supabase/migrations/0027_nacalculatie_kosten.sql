-- Nacalculatie makkelijker maken: een uurtarief per personeelslid zodat
-- geregistreerde uren automatisch als arbeidskosten meetellen, en losse
-- kostenposten (materiaal, onderaannemers, ...) in plaats van één
-- handmatig in te typen totaalbedrag "werkelijke kosten".
alter table team_members add column if not exists hourly_rate numeric(6, 2);

create table cost_items (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  description text not null,
  amount numeric(10, 2) not null,
  created_at timestamptz not null default now()
);

alter table cost_items enable row level security;

-- Zelfde harde regel als uren/nacalculatie: alleen de eigenaar, nooit
-- team of klant, geen module-toggle.
create policy cost_items_select on cost_items for select
  using (has_project_access(project_id) and is_owner());
create policy cost_items_write on cost_items for all
  using (has_project_access(project_id) and is_owner() and not is_project_locked(project_id))
  with check (has_project_access(project_id) and is_owner() and not is_project_locked(project_id));
