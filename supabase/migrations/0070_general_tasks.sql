-- Algemene te-doen-items die niet aan een project vastzitten — "bel
-- leverancier X", "auto laten keuren", dat soort dingen. Bewust een
-- losse tabel i.p.v. tasks.project_id nullable maken: tasks hangt vol
-- met has_project_access()/has_module_access()-aannames die overal
-- project_id als verplicht beschouwen (cron-herinneringen, voortgang,
-- dossier-badge), dat allemaal omgooien voor deze kleine uitbreiding
-- is meer risico dan het waard is. Klant komt hier bewust niet bij —
-- dit is puur intern, net als de bestaande assignee_type 'eigenaar'.
create table general_tasks (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  assignee_type text not null default 'eigenaar' check (assignee_type in ('eigenaar', 'team')),
  assignee_team_member_ids uuid[] not null default '{}',
  due_date date,
  done boolean not null default false,
  done_by text,
  done_at timestamptz,
  created_at timestamptz not null default now()
);

alter table general_tasks enable row level security;

-- Zelfde patroon als tasks_select (0020): eigenaar ziet alles, een
-- teamlid alleen 'team'-items waar hij/zij ook echt bij hoort (niemand
-- aangevinkt = open voor het hele team).
create policy general_tasks_select on general_tasks for select
  using (
    is_owner()
    or (
      current_profile_role() = 'team' and assignee_type = 'team'
      and (assignee_team_member_ids = '{}' or current_team_member_id() = any(assignee_team_member_ids))
    )
  );

create policy general_tasks_insert on general_tasks for insert
  with check (is_owner() or current_profile_role() = 'team');

create policy general_tasks_update on general_tasks for update
  using (
    is_owner()
    or (
      current_profile_role() = 'team' and assignee_type = 'team'
      and (assignee_team_member_ids = '{}' or current_team_member_id() = any(assignee_team_member_ids))
    )
  )
  with check (
    is_owner()
    or (
      current_profile_role() = 'team' and assignee_type = 'team'
      and (assignee_team_member_ids = '{}' or current_team_member_id() = any(assignee_team_member_ids))
    )
  );

create policy general_tasks_delete on general_tasks for delete
  using (is_owner());
