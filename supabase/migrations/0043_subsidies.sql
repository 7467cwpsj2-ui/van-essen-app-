-- Subsidiemodule (ISDE) — een eigenaar-beheerde meldcodedatabase en een
-- simpele subsidiecheck per project, die uitmondt in een exporteerbaar
-- document waarmee het aanvragen van subsidie voor de klant makkelijker
-- wordt. Bewust beperkt gehouden: geen workflow/statussen, geen
-- automatische foto-verplichtingen, geen RVO-koppeling — dat kan later
-- als dit in de praktijk bevalt. Subsidiebedragen en meldcodes staan
-- nooit hardcoded in de app, alleen hier in de database, door de
-- eigenaar te beheren en op elk moment aan te passen.
create table if not exists subsidy_products (
  id uuid primary key default gen_random_uuid(),
  category text not null,
  measure text not null,
  manufacturer text,
  product_name text not null,
  type text,
  meldcode text,
  unit text not null default 'stuk',
  subsidy_amount numeric not null default 0,
  valid_from date,
  valid_to date,
  active boolean not null default true,
  notes text,
  created_at timestamptz not null default now()
);

alter table subsidy_products enable row level security;

create policy subsidy_products_select on subsidy_products
  for select using (is_owner() or current_profile_role() = 'team');

create policy subsidy_products_write on subsidy_products
  for all using (is_owner()) with check (is_owner());

-- Regels die aan een project zijn toegevoegd — bewust een snapshot van
-- de productgegevens op het moment van toevoegen (niet een live join
-- naar subsidy_products), zodat een later gewijzigd of gedeactiveerd
-- product de al gemaakte subsidiecheck van een project niet met
-- terugwerkende kracht verandert.
create table if not exists subsidy_check_items (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  product_id uuid references subsidy_products(id) on delete set null,
  category text not null,
  measure text not null,
  manufacturer text,
  product_name text not null,
  type text,
  meldcode text,
  quantity numeric not null default 1,
  unit text not null default 'stuk',
  amount_per_unit numeric not null default 0,
  indicative_subsidy numeric not null default 0,
  execution_date date,
  notes text,
  created_by text,
  created_at timestamptz not null default now()
);

alter table subsidy_check_items enable row level security;

create policy subsidy_check_items_all on subsidy_check_items
  for all using (has_project_access(project_id) and current_profile_role() <> 'klant')
  with check (has_project_access(project_id) and current_profile_role() <> 'klant');

create index if not exists subsidy_check_items_project_id_idx on subsidy_check_items(project_id);
