-- Een 'te doen' voor het team kan nu aan meerdere specifieke teamleden
-- tegelijk toegewezen worden (leeg = iedereen in het team), i.p.v. maar
-- één persoon of iedereen.

alter table tasks add column assignee_team_member_ids uuid[] not null default '{}';

update tasks
set assignee_team_member_ids = array[assignee_team_member_id]
where assignee_team_member_id is not null;

drop policy if exists tasks_update on tasks;

alter table tasks drop column assignee_team_member_id;

create policy tasks_update on tasks for update
  using (
    has_project_access(project_id) and has_module_access(project_id, 'planning') and not is_project_locked(project_id)
    and (
      is_owner()
      or (
        current_profile_role() = 'team' and assignee_type = 'team'
        and (assignee_team_member_ids = '{}' or current_team_member_id() = any(assignee_team_member_ids))
      )
      or (current_profile_role() = 'klant' and assignee_type = 'klant')
    )
  )
  with check (
    has_project_access(project_id) and has_module_access(project_id, 'planning') and not is_project_locked(project_id)
    and (
      is_owner()
      or (
        current_profile_role() = 'team' and assignee_type = 'team'
        and (assignee_team_member_ids = '{}' or current_team_member_id() = any(assignee_team_member_ids))
      )
      or (current_profile_role() = 'klant' and assignee_type = 'klant')
    )
  );
