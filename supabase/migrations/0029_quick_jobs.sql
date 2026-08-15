-- Kleine klussen (1-3 dagen) los van een project/klant, alleen voor de
-- algemene planning — de eigenaar wil deze snel kunnen inplannen zonder
-- eerst een heel project met klant te hoeven aanmaken.
create table quick_jobs (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  assignee text,
  assignee_team_member_ids uuid[] not null default '{}',
  start_date date not null,
  end_date date not null,
  created_at timestamptz not null default now()
);

alter table quick_jobs enable row level security;

-- Puur een eigenaar-tool, geen klant/team-koppeling nodig.
create policy quick_jobs_all on quick_jobs for all
  using (is_owner()) with check (is_owner());
