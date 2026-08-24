-- Eenmalige opschoning van verweesde teamlid-verwijzingen. Tot nu toe
-- verwijderde het verwijderen van een teamlid alleen de team_members-rij
-- zelf, niet de id's die nog in fases/taken/losse klussen stonden
-- (assignee_team_member_ids is een uuid[], Postgres kent daar geen
-- foreign-key-afdwinging op) — die toonden daardoor "Onbekend
-- personeelslid" of "?" in de planning in plaats van gewoon te
-- verdwijnen. lib/actions/team.ts's removeTeamMember() ruimt dit vanaf
-- nu zelf op bij het verwijderen; dit is puur het opschonen van al
-- bestaande, van vóór die fix daterende verweesde id's.

update schedule_phases
set assignee_team_member_ids = (
  select coalesce(array_agg(x), '{}')
  from unnest(assignee_team_member_ids) x
  where exists (select 1 from team_members where id = x)
)
where assignee_team_member_ids <> '{}';

update tasks
set assignee_team_member_ids = (
  select coalesce(array_agg(x), '{}')
  from unnest(assignee_team_member_ids) x
  where exists (select 1 from team_members where id = x)
)
where assignee_team_member_ids <> '{}';

update quick_jobs
set assignee_team_member_ids = (
  select coalesce(array_agg(x), '{}')
  from unnest(assignee_team_member_ids) x
  where exists (select 1 from team_members where id = x)
)
where assignee_team_member_ids <> '{}';

update quick_jobs
set day_assignments = (
  select jsonb_agg(
    jsonb_set(
      elem,
      '{team_member_ids}',
      (
        select coalesce(jsonb_agg(tmid), '[]'::jsonb)
        from jsonb_array_elements_text(elem -> 'team_member_ids') tmid
        where exists (select 1 from team_members where id::text = tmid)
      )
    )
  )
  from jsonb_array_elements(day_assignments) elem
)
where day_assignments is not null;
