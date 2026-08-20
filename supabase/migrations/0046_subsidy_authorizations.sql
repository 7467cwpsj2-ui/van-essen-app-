-- Machtiging (ISDE-machtigingsformulier voor woningeigenaren): de klant
-- geeft Van Essen expliciet toestemming om namens hem/haar de
-- ISDE-aanvraag in te dienen, te beheren en eventueel bezwaar te maken —
-- exact de drie fases die RVO's officiële machtigingsformulier vereist.
-- Dit formulier hoeft NIET naar RVO gestuurd te worden bij de aanvraag;
-- het moet bewaard blijven in de eigen administratie en kan later door
-- RVO worden opgevraagd bij een controle. Vandaar: permanent bewaren,
-- nooit automatisch verwijderen.
create table if not exists subsidy_authorizations (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade unique,
  scope text not null default 'aanvraag_beheer_bezwaar' check (scope in ('aanvraag', 'aanvraag_beheer', 'aanvraag_beheer_bezwaar')),
  status text not null default 'wacht_op_klant' check (status in ('wacht_op_klant', 'ondertekend')),
  requested_by text,
  requested_at timestamptz not null default now(),
  client_signature_path text,
  client_signed_by text,
  client_signed_at timestamptz,
  created_at timestamptz not null default now()
);

alter table subsidy_authorizations enable row level security;

-- Select is bewust open voor iedereen met projecttoegang (dus ook de
-- klant zelf) — anders kan de klant zijn eigen machtigingsstatus niet
-- zien om te ondertekenen.
create policy subsidy_authorizations_select on subsidy_authorizations
  for select using (has_project_access(project_id));

create policy subsidy_authorizations_insert on subsidy_authorizations
  for insert with check (has_project_access(project_id) and current_profile_role() <> 'klant');

create policy subsidy_authorizations_delete on subsidy_authorizations
  for delete using (has_project_access(project_id) and current_profile_role() <> 'klant');

-- Update mag door iedereen met projecttoegang: de klant zet hiermee zijn
-- handtekening, de eigenaar/team kan een aanvraag intrekken/resetten.
-- De server actions bepalen per rol precies welke velden mogen wijzigen.
create policy subsidy_authorizations_update on subsidy_authorizations
  for update using (has_project_access(project_id)) with check (has_project_access(project_id));

-- Bedrijfsgegevens van Van Essen zelf — nodig als "gemachtigde" op het
-- machtigingsformulier. Eén keer instellen bij Instellingen, daarna
-- overal herbruikt waar de bedrijfsgegevens nodig zijn.
alter table app_settings add column if not exists company_name text not null default 'Van Essen Bouw & Onderhoud';
alter table app_settings add column if not exists company_kvk text;
alter table app_settings add column if not exists company_address text;
alter table app_settings add column if not exists company_postal_city text;
alter table app_settings add column if not exists company_phone text;
alter table app_settings add column if not exists company_email text;
