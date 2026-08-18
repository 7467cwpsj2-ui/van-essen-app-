-- Offertes/leads: aanvragen en locatiebezoeken vóór er een project
-- bestaat, zodat de eigenaar automatisch herinnerd wordt als een
-- offerte na een bezoek nog niet verstuurd is.
create table leads (
  id uuid primary key default gen_random_uuid(),
  client_name text not null,
  address text,
  phone text,
  email text,
  description text,
  visit_date date,
  status text not null default 'open' check (status in ('open', 'offerte_verzonden', 'gewonnen', 'verloren')),
  converted_project_id uuid references projects(id) on delete set null,
  last_reminder_sent_at timestamptz,
  created_by uuid references profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

alter table leads enable row level security;

-- Puur een eigenaar-tool, geen klant/team-koppeling nodig.
create policy leads_all on leads for all
  using (is_owner()) with check (is_owner());

-- Na hoeveel dagen zonder verstuurde offerte de herinnering start (en
-- daarna elke zoveel dagen herhaalt totdat de status verandert).
alter table app_settings add column if not exists lead_reminder_days integer not null default 3;
