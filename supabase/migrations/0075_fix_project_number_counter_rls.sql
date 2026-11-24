-- Bugfix: op de live database staat row level security standaard aan
-- voor nieuwe tabellen, en project_number_counters kreeg in migratie
-- 0074 geen policy — daardoor weigerde elke insert/update van een
-- gewone (authenticated) gebruiker met "new row violates row-level
-- security policy for table project_number_counters", zodra een nieuw
-- project of losse klus werd aangemaakt (alleen de SQL Editor, die als
-- beheerder draait, kon de teller ophogen).
--
-- Oplossing: next_project_number() security definer maken, zoals ook
-- elders in deze codebase gebeurt voor smalle, gecontroleerde RPC's
-- (zie bijv. toggle_quick_job_done/has_planning_view_access) — de
-- functie zelf blijft het enige, gecontroleerde pad naar deze tabel,
-- dus directe toegang hoeft nergens voor open te staan.
alter table project_number_counters enable row level security;

create or replace function next_project_number(p_year integer) returns integer
language plpgsql security definer set search_path = public as $$
declare
  result integer;
begin
  insert into project_number_counters (year, last_seq) values (p_year, 1)
  on conflict (year) do update set last_seq = project_number_counters.last_seq + 1
  returning last_seq into result;
  return result;
end;
$$;
