-- Alleen de eigenaar mag een te-doen aanmaken die aan de klant is
-- toegewezen — een teamlid mag alleen zichzelf, het team, of de
-- eigenaar kiezen.

drop policy if exists tasks_insert on tasks;
create policy tasks_insert on tasks for insert
  with check (
    has_project_access(project_id) and has_module_access(project_id, 'planning') and not is_project_locked(project_id)
    and (
      is_owner()
      or (current_profile_role() = 'team' and assignee_type in ('eigenaar', 'team'))
    )
  );
