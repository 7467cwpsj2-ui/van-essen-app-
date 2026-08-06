-- Planning wordt een 'te doen'-lijst: korte herinneringen/actiepunten
-- ("bel leverancier", "zoek iets uit", "regel iets") die de eigenaar,
-- een teamlid, of de klant zelf kan afvinken. Losgekoppeld van de
-- bouwplanning-fases — die blijven puur op datums gebaseerd (zie de
-- aangepaste projectProgress()-berekening in de app, die niet langer
-- op taken steunt).

alter table tasks
  add column assignee_type text not null default 'eigenaar' check (assignee_type in ('eigenaar', 'team', 'klant')),
  add column assignee_team_member_id uuid references team_members(id) on delete set null,
  add column done_by text,
  add column done_at timestamptz;

-- Best-effort: bestaande taken met een vrije-tekst 'assignee' die
-- toevallig een teamlid-naam is, koppelen aan dat teamlid.
update tasks t
set assignee_type = 'team', assignee_team_member_id = tm.id
from team_members tm
where t.assignee is not null and tm.name = t.assignee;

-- ============================================================
-- RLS: iedereen met moduletoegang ziet relevante items. Afvinken mag
-- alleen wie het item toegewezen kreeg (of de eigenaar, altijd).
-- Aanmaken/verwijderen blijft voorbehouden aan eigenaar + team.
-- ============================================================

drop policy if exists tasks_select on tasks;
create policy tasks_select on tasks for select
  using (
    has_project_access(project_id) and has_module_access(project_id, 'planning')
    and (
      is_owner()
      or current_profile_role() = 'team'
      or (current_profile_role() = 'klant' and assignee_type = 'klant')
    )
  );

drop policy if exists tasks_write on tasks;

create policy tasks_insert on tasks for insert
  with check (
    has_project_access(project_id) and has_module_access(project_id, 'planning') and not is_project_locked(project_id)
    and (is_owner() or current_profile_role() = 'team')
  );

create policy tasks_update on tasks for update
  using (
    has_project_access(project_id) and has_module_access(project_id, 'planning') and not is_project_locked(project_id)
    and (
      is_owner()
      or (
        current_profile_role() = 'team' and assignee_type = 'team'
        and (assignee_team_member_id is null or assignee_team_member_id = current_team_member_id())
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
        and (assignee_team_member_id is null or assignee_team_member_id = current_team_member_id())
      )
      or (current_profile_role() = 'klant' and assignee_type = 'klant')
    )
  );

create policy tasks_delete on tasks for delete
  using (
    has_project_access(project_id) and has_module_access(project_id, 'planning') and not is_project_locked(project_id)
    and is_owner()
  );
