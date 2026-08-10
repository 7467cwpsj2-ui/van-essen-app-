-- Klant kan nu ook zelf een opleverpunt aanmaken (met foto/bestand en
-- een opmerking), maar dan altijd als status 'nieuw' zonder
-- verantwoordelijke — de eigenaar moet het eerst controleren en de
-- juiste persoon aanwijzen (zie reviewCompletionPoint) voordat het een
-- gewoon, toegewezen opleverpunt wordt.

alter table completion_points add column note text;
alter table completion_points add column file_type text check (file_type in ('image', 'pdf'));

alter table completion_points drop constraint completion_points_status_check;
alter table completion_points add constraint completion_points_status_check
  check (status in ('nieuw', 'open', 'gereed', 'goedgekeurd'));

drop policy if exists completion_points_insert on completion_points;
create policy completion_points_insert on completion_points for insert
  with check (
    has_project_access(project_id) and has_module_access(project_id, 'opleverpunten')
    and not is_project_locked(project_id)
    and (
      is_owner()
      or (
        current_profile_role() = 'klant'
        and status = 'nieuw'
        and responsible_team_member_id is null
      )
    )
  );
