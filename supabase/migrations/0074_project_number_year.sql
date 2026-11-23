-- Projectnummer met jaarreferentie: in plaats van één kaal, doorlopend
-- volgnummer (migratie 0073) nu een reeks die ieder jaar weer bij 1
-- begint, met het jaartal erbij — zo is in één oogopslag te zien uit
-- welk jaar een project/klus komt, en het nummer loopt binnen een jaar
-- gewoon netjes op in plaats van willekeurig te lijken (zie
-- lib/projectNumber.ts voor hoe het controlecijfer achteraan wordt
-- berekend/getoond).
create table project_number_counters (
  year integer primary key,
  last_seq integer not null default 0
);

create function next_project_number(p_year integer) returns integer
language plpgsql as $$
declare
  result integer;
begin
  insert into project_number_counters (year, last_seq) values (p_year, 1)
  on conflict (year) do update set last_seq = project_number_counters.last_seq + 1
  returning last_seq into result;
  return result;
end;
$$;

alter table projects add column project_number_year integer;
alter table projects alter column project_number_year set default extract(year from now())::int;
alter table projects alter column project_number set default next_project_number(extract(year from now())::int);
alter table projects drop constraint if exists projects_project_number_key;

alter table quick_jobs add column project_number_year integer;
alter table quick_jobs alter column project_number_year set default extract(year from now())::int;
alter table quick_jobs alter column project_number set default next_project_number(extract(year from now())::int);
alter table quick_jobs drop constraint if exists quick_jobs_project_number_key;

-- Alles opnieuw nummeren op volgorde van aanmaakdatum, nu per
-- aanmaakjaar. Werkt ook als migratie 0073 hiervoor nog niet gedraaid
-- was (dan staat project_number nog overal op NULL, wat hier evengoed
-- netjes wordt opgevuld).
do $$
declare
  rec record;
begin
  for rec in select id, extract(year from created_at)::int as yr from projects order by created_at loop
    update projects set project_number_year = rec.yr, project_number = next_project_number(rec.yr) where id = rec.id;
  end loop;
  for rec in select id, extract(year from created_at)::int as yr from quick_jobs order by created_at loop
    update quick_jobs set project_number_year = rec.yr, project_number = next_project_number(rec.yr) where id = rec.id;
  end loop;
end $$;

alter table projects alter column project_number_year set not null;
alter table quick_jobs alter column project_number_year set not null;
alter table projects add constraint projects_project_number_year_key unique (project_number_year, project_number);
alter table quick_jobs add constraint quick_jobs_project_number_year_key unique (project_number_year, project_number);

drop sequence if exists project_number_seq;
