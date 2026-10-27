-- Een afgeronde klus was tot nu toe niet echt vergrendeld voor uren —
-- in tegenstelling tot een afgerond/ondertekend project (is_project_locked)
-- kon iedereen met toegang gewoon uren blijven boeken op een klus met
-- quick_jobs.done = true. Dat leverde twee problemen op: de uren-kies-
-- pagina bleef vol staan met allang afgeronde klussen, en er was geen
-- enkele harde grens die dat tegenhield. Zelfde regel als bij een
-- project: eenmaal "klaar" is klaar, tenzij je 'm bewust heropent.

drop policy if exists hours_insert on hours;
create policy hours_insert on hours for insert
  with check (
    (
      project_id is not null and has_project_access(project_id) and not is_project_locked(project_id)
      and (is_owner() or (current_profile_role() = 'team' and team_member_id = current_team_member_id()))
    )
    or (
      quick_job_id is not null
      and not exists (select 1 from quick_jobs where id = quick_job_id and done)
      and (
        is_owner()
        or (
          current_profile_role() = 'team' and team_member_id = current_team_member_id()
          and exists (
            select 1 from quick_jobs
            where id = quick_job_id and current_team_member_id() = any(assignee_team_member_ids)
          )
        )
      )
    )
  );

drop policy if exists hours_update on hours;
create policy hours_update on hours for update
  using (
    (
      project_id is not null and not is_project_locked(project_id)
      and (is_owner() or (current_profile_role() = 'team' and team_member_id = current_team_member_id()))
    )
    or (
      quick_job_id is not null
      and not exists (select 1 from quick_jobs where id = quick_job_id and done)
      and (is_owner() or (current_profile_role() = 'team' and team_member_id = current_team_member_id()))
    )
  )
  with check (project_id is null or has_project_access(project_id));

drop policy if exists hours_delete on hours;
create policy hours_delete on hours for delete
  using (
    (
      project_id is not null and not is_project_locked(project_id)
      and (is_owner() or (current_profile_role() = 'team' and team_member_id = current_team_member_id()))
    )
    or (
      quick_job_id is not null
      and not exists (select 1 from quick_jobs where id = quick_job_id and done)
      and (is_owner() or (current_profile_role() = 'team' and team_member_id = current_team_member_id()))
    )
  );
