-- Personeel kon uren alleen op een echt project registreren. Nu kan dat
-- ook op een kleine klus (quick_jobs) — dezelfde tabel, met een nieuwe
-- optionele quick_job_id ernaast i.p.v. een aparte tabel, want de rest
-- van een uren-rij (teamlid, datum, uren, opmerking) is identiek.

alter table hours alter column project_id drop not null;
alter table hours add column quick_job_id uuid references quick_jobs(id) on delete cascade;
alter table hours add constraint hours_target_check check (
  (project_id is not null and quick_job_id is null) or (project_id is null and quick_job_id is not null)
);

drop policy if exists hours_select on hours;
create policy hours_select on hours for select
  using (
    (
      project_id is not null and has_project_access(project_id)
      and (is_owner() or (current_profile_role() = 'team' and team_member_id = current_team_member_id()))
    )
    or (
      quick_job_id is not null
      and (is_owner() or (current_profile_role() = 'team' and team_member_id = current_team_member_id()))
    )
  );

drop policy if exists hours_insert on hours;
create policy hours_insert on hours for insert
  with check (
    (
      project_id is not null and has_project_access(project_id) and not is_project_locked(project_id)
      and (is_owner() or (current_profile_role() = 'team' and team_member_id = current_team_member_id()))
    )
    or (
      quick_job_id is not null
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
      and (is_owner() or (current_profile_role() = 'team' and team_member_id = current_team_member_id()))
    )
  );
