-- Van Essen Bouw & Onderhoud — Fase 3 (aanvulling)
--
-- Voegt toe: urenregistratie (team logt eigen uren, eigenaar ziet
-- totalen — nooit klantzichtbaar, harde regel) en nacalculatie
-- (begroot vs. werkelijk, alleen eigenaar). "Begroot" hergebruikt het
-- offertebedrag (projects.quote_amount) dat het opleverdossier al
-- gebruikt, zodat er niet twee losse bedragen door elkaar kunnen lopen.

alter table projects
  add column actual_cost numeric(10, 2) not null default 0;

create table hours (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  team_member_id uuid not null references team_members(id) on delete cascade,
  work_date date not null,
  hours numeric(4, 1) not null check (hours > 0 and hours <= 24),
  note text,
  created_at timestamptz not null default now()
);

alter table hours enable row level security;

-- Uren en nacalculatie zijn een harde regel: nooit klantzichtbaar, geen
-- module-toggle. Team ziet alleen de eigen registraties; de eigenaar
-- ziet alles (nodig voor de totalen).
create policy hours_select on hours for select
  using (
    has_project_access(project_id)
    and (is_owner() or (current_profile_role() = 'team' and team_member_id = current_team_member_id()))
  );
create policy hours_insert on hours for insert
  with check (
    has_project_access(project_id) and not is_project_locked(project_id)
    and (
      (is_owner())
      or (current_profile_role() = 'team' and team_member_id = current_team_member_id())
    )
  );
create policy hours_update on hours for update
  using (
    not is_project_locked(project_id)
    and (is_owner() or (current_profile_role() = 'team' and team_member_id = current_team_member_id()))
  )
  with check (has_project_access(project_id));
create policy hours_delete on hours for delete
  using (
    not is_project_locked(project_id)
    and (is_owner() or (current_profile_role() = 'team' and team_member_id = current_team_member_id()))
  );

-- Nacalculatie: alleen de eigenaar mag actual_cost bijwerken. quote_amount
-- (het "begroot"-bedrag) valt al onder de bestaande projects_update-policy.
-- Geen aparte tabel nodig — één kolom op projects volstaat.
