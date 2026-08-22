-- Meer-/minderwerk mag nooit door team gezien worden (alleen eigenaar en
-- klant) — een harde regel, niet meer een per-teamlid-toggle. Rest van
-- de functie ongewijzigd t.o.v. 0001_init.sql.
create or replace function has_module_access(p_project_id uuid, p_module text)
returns boolean
language sql stable security definer
set search_path = public
as $$
  select
    is_owner()
    or (
      current_profile_role() = 'team'
      and p_module <> 'meerwerk'
      and has_project_access(p_project_id)
      and coalesce((select (permissions ->> p_module)::boolean from team_members where id = current_team_member_id()), true)
    )
    or (
      current_profile_role() = 'klant'
      and has_project_access(p_project_id)
      and coalesce((select (permissions ->> p_module)::boolean from clients where id = current_client_id()), true)
    );
$$;
