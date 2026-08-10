-- Bij een notitie met zichtbaarheid "team" kan nu optioneel gekozen
-- worden welke specifieke teamleden 'm mogen zien i.p.v. het hele team
-- (leeg = iedereen in het team, zoals nu al het geval is) — zelfde
-- patroon als de multi-select bij te-doen.

alter table notes add column visible_team_member_ids uuid[] not null default '{}';

drop policy if exists notes_select on notes;
create policy notes_select on notes for select
  using (
    has_project_access(project_id) and has_module_access(project_id, 'notities')
    and (
      is_owner()
      or author_id = auth.uid()
      or (
        current_profile_role() = 'team' and visibility = 'team'
        and (visible_team_member_ids = '{}' or current_team_member_id() = any(visible_team_member_ids))
      )
      or (current_profile_role() = 'klant' and visibility in ('klant', 'alleen_klant'))
    )
  );
