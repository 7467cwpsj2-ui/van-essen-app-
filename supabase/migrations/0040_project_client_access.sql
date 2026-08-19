-- Meerdere klantaccounts aan één project koppelen. Tot nu toe kon een
-- project maar aan precies één klant hangen (projects.client_id). Deze
-- migratie voegt een koppeltabel toe (zelfde patroon als
-- project_team_access voor teamleden) waarmee extra klanten volledige,
-- gelijkwaardige toegang tot hetzelfde project krijgen: allebei kunnen
-- onafhankelijk meerwerk goedkeuren, het dossier ondertekenen en
-- klantkeuzes maken. Wie het eerst klikt is definitief — geen dubbele
-- goedkeuring nodig, exact zoals het bestaande systeem met één klant nu
-- al werkt.
create table if not exists project_client_access (
  project_id uuid not null references projects(id) on delete cascade,
  client_id uuid not null references clients(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (project_id, client_id)
);

alter table project_client_access enable row level security;

create policy project_client_access_select on project_client_access
  for select using (is_owner() or client_id = current_client_id());

create policy project_client_access_write on project_client_access
  for all using (is_owner()) with check (is_owner());

-- has_project_access() herschreven: de klant-tak controleert nu ook
-- project_client_access naast het bestaande primaire projects.client_id.
-- Rest van de functie ongewijzigd t.o.v. 0001_init.sql.
create or replace function has_project_access(p_project_id uuid)
returns boolean
language sql stable security definer
set search_path = public
as $$
  select
    is_owner()
    or (
      current_profile_role() = 'team'
      and (
        coalesce((select sees_all_projects from team_members where id = current_team_member_id()), false)
        or exists (
          select 1 from project_team_access
          where project_id = p_project_id and team_member_id = current_team_member_id()
        )
      )
    )
    or (
      current_profile_role() = 'klant'
      and (
        exists (select 1 from projects where id = p_project_id and client_id = current_client_id())
        or exists (
          select 1 from project_client_access
          where project_id = p_project_id and client_id = current_client_id()
        )
      )
    );
$$;
