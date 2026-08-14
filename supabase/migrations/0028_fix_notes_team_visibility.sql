-- Bug: notities met zichtbaarheid 'klant' (= "Team + klant" in de UI)
-- waren niet zichtbaar voor het team, alleen voor de klant zelf — de
-- teamleden-voorwaarde in notes_select controleerde alleen exact
-- visibility = 'team', terwijl 'klant' juist "team + klant" betekent.
drop policy if exists notes_select on notes;
create policy notes_select on notes for select
  using (
    has_project_access(project_id) and has_module_access(project_id, 'notities')
    and (
      is_owner()
      or author_id = auth.uid()
      or (
        current_profile_role() = 'team' and visibility in ('team', 'klant')
        and (visible_team_member_ids = '{}' or current_team_member_id() = any(visible_team_member_ids))
      )
      or (current_profile_role() = 'klant' and visibility in ('klant', 'alleen_klant'))
    )
  );
