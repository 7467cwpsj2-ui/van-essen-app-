-- Aanvraagregistratie: nadat de eigenaar zelf (via eHerkenning, buiten
-- de app) een ISDE-aanvraag bij RVO heeft ingediend, legt hij hier het
-- aanvraagnummer en de status vast — puur eigen administratie, de app
-- dient nooit zelf iets in bij RVO. Eén rij per project, net als de
-- machtiging.
create table if not exists subsidy_applications (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade unique,
  status text not null default 'concept' check (
    status in ('concept', 'ingediend', 'in_behandeling', 'aanvullende_info_gevraagd', 'goedgekeurd', 'afgewezen', 'uitbetaald')
  ),
  application_number text,
  submitted_at date,
  decision_amount numeric,
  notes text,
  updated_by text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table subsidy_applications enable row level security;

create policy subsidy_applications_all on subsidy_applications
  for all using (has_project_access(project_id) and is_owner())
  with check (has_project_access(project_id) and is_owner());
