-- Uitvoerders (eigen personeel) kunnen voortaan ook naar de algemene
-- planning kijken, en desgewenst zelf wijzigingen voorstellen — die
-- gaan dan eerst langs de eigenaar ter goedkeuring, net als nu al bij
-- notities gebeurt. Drie niveaus per teamlid: 'geen' (standaard,
-- verandert niets voor bestaand personeel), 'bekijken', of 'wijzigen'
-- (bekijken + zelf voorstellen indienen).
alter table team_members add column planning_overzicht_access text not null default 'geen'
  check (planning_overzicht_access in ('geen', 'bekijken', 'wijzigen'));

create or replace function has_planning_view_access()
returns boolean
language sql stable security definer
set search_path = public
as $$
  select
    is_owner()
    or (
      current_profile_role() = 'team'
      and coalesce(
        (select planning_overzicht_access in ('bekijken', 'wijzigen') from team_members where id = current_team_member_id()),
        false
      )
    );
$$;

create or replace function has_planning_edit_access()
returns boolean
language sql stable security definer
set search_path = public
as $$
  select
    is_owner()
    or (
      current_profile_role() = 'team'
      and coalesce(
        (select planning_overzicht_access = 'wijzigen' from team_members where id = current_team_member_id()),
        false
      )
    );
$$;

-- De algemene planning is bedrijfsbreed (alle projecten tegelijk), dus
-- wie hier toegang toe krijgt, ziet noodgedwongen ook fases van
-- projecten waar diegene normaal geen toegang tot heeft — dat is
-- precies het doel van dit overzicht. Wélke personen (eigen personeel
-- vs onderaannemers) daadwerkelijk getoond worden aan zo'n viewer,
-- wordt in de applicatielaag afgehandeld (planning-overzicht/page.tsx),
-- niet hier: één fase/klus kan meerdere mensen van beide types tegelijk
-- toegewezen krijgen, en RLS kan geen losse array-elementen uit een rij
-- filteren, alleen hele rijen toelaten of weigeren.
create policy schedule_phases_select_planning_overzicht on schedule_phases for select
  using (has_planning_view_access());
create policy projects_select_planning_overzicht on projects for select
  using (has_planning_view_access());
create policy quick_jobs_select_planning_overzicht on quick_jobs for select
  using (has_planning_view_access());

-- Kleine, niet-planningskritische acties (gereed afvinken, kleur
-- aanpassen) mogen bij "wijzigen"-toegang direct door, zonder de
-- goedkeuringsflow — via een smalle, eigen RPC per actie i.p.v. brede
-- UPDATE-rechten op quick_jobs/projects. Zo kan een teamlid met
-- wijzigen-toegang niet via een rechtstreekse tabel-aanroep alsnog om
-- de goedkeuringsflow heen voor de wél gevoelige velden (titel, datum,
-- bezetting) — quick_jobs_all/projects_update blijven verder
-- eigenaar-only, precies zoals nu.
create or replace function toggle_quick_job_done(p_id uuid, p_done boolean)
returns void
language plpgsql security definer
set search_path = public
as $$
begin
  if not has_planning_edit_access() then
    raise exception 'Geen toegang om deze klus te wijzigen.';
  end if;
  update quick_jobs set done = p_done where id = p_id;
end;
$$;

create or replace function update_quick_job_color(p_id uuid, p_color text)
returns void
language plpgsql security definer
set search_path = public
as $$
begin
  if not has_planning_edit_access() then
    raise exception 'Geen toegang om deze klus te wijzigen.';
  end if;
  if p_color !~ '^#[0-9a-fA-F]{6}$' then
    raise exception 'Ongeldige kleur.';
  end if;
  update quick_jobs set color = p_color where id = p_id;
end;
$$;

create or replace function update_project_planning_color(p_id uuid, p_color text)
returns void
language plpgsql security definer
set search_path = public
as $$
begin
  if not has_planning_edit_access() then
    raise exception 'Geen toegang om deze kleur te wijzigen.';
  end if;
  if p_color !~ '^#[0-9a-fA-F]{6}$' then
    raise exception 'Ongeldige kleur.';
  end if;
  update projects set planning_color = p_color where id = p_id;
end;
$$;

-- Wijzigingsvoorstellen: een teamlid met "wijzigen"-toegang dient hier
-- een voorstel in i.p.v. rechtstreeks te schrijven naar quick_jobs
-- (waar RLS ze sowieso niet bij mag, zie quick_jobs_all) — de eigenaar
-- keurt goed of af, en pas bij goedkeuring past een server action de
-- echte wijziging toe (uitgevoerd als de eigenaar zelf, dus binnen de
-- bestaande quick_jobs-rechten).
create table planning_change_requests (
  id uuid primary key default gen_random_uuid(),
  requested_by uuid not null references auth.users(id) on delete cascade,
  requested_by_name text not null,
  action text not null check (action in ('create', 'update', 'delete', 'day_assignment')),
  quick_job_id uuid references quick_jobs(id) on delete cascade,
  summary text not null,
  payload jsonb not null,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  reviewed_at timestamptz,
  created_at timestamptz not null default now()
);

create index planning_change_requests_status_idx on planning_change_requests (status, created_at desc);
create index planning_change_requests_requester_idx on planning_change_requests (requested_by, created_at desc);

alter table planning_change_requests enable row level security;

create policy planning_change_requests_select on planning_change_requests for select
  using (is_owner() or requested_by = auth.uid());
create policy planning_change_requests_insert on planning_change_requests for insert
  with check (requested_by = auth.uid() and has_planning_edit_access());
create policy planning_change_requests_update on planning_change_requests for update
  using (is_owner()) with check (is_owner());
-- Een teamlid mag een eigen, nog onbehandeld voorstel intrekken.
create policy planning_change_requests_delete on planning_change_requests for delete
  using (requested_by = auth.uid() and status = 'pending');
