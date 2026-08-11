-- Een teamlid zag tot nu toe alle te-doen-items van een project, ook
-- items die voor de eigenaar, de klant, of specifiek voor een ander
-- teamlid waren. Nu ziet een teamlid alleen de items die voor "team"
-- staan waar hij/zij ook daadwerkelijk bij hoort (niemand aangevinkt =
-- open voor het hele team, zoals dat ook al bepaalde wie het mocht
-- afvinken) — de eigenaar blijft, zoals overal, alles zien.

drop policy if exists tasks_select on tasks;
create policy tasks_select on tasks for select
  using (
    has_project_access(project_id) and has_module_access(project_id, 'planning')
    and (
      is_owner()
      or (
        current_profile_role() = 'team' and assignee_type = 'team'
        and (assignee_team_member_ids = '{}' or current_team_member_id() = any(assignee_team_member_ids))
      )
      or (current_profile_role() = 'klant' and assignee_type = 'klant')
    )
  );
