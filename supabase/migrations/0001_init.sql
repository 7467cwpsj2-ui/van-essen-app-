-- Van Essen Bouw & Onderhoud — Fase 1 schema
--
-- Dekt: rollen/rechten, projecten, planning, bouwplanning, documenten
-- (tekeningen/foto's), meerwerk-goedkeuring met handtekening.
-- Bewust NIET in dit schema: chat, uren, veiligheid, financieel,
-- nacalculatie, opleverdossier, sjablonen — die volgen in latere fases.
--
-- Uitgangspunt: single-tenant (één bedrijf, zoals het prototype: één
-- eigenaarsaccount, één team- en klantenlijst). Rechten worden hier
-- afgedwongen via Row Level Security, niet alleen in de UI.

create extension if not exists pgcrypto;

-- ============================================================
-- Tabellen
-- ============================================================

create table team_members (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  trade text,
  -- module-zichtbaarheid, bv. {"planning": true, "bouwplanning": true, "tekeningen": true, "fotos": true, "meerwerk": true}
  permissions jsonb not null default '{"planning": true, "bouwplanning": true, "tekeningen": true, "fotos": true, "meerwerk": true}'::jsonb,
  can_edit_schedule boolean not null default false,
  sees_all_projects boolean not null default true,
  created_at timestamptz not null default now()
);

create table clients (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  permissions jsonb not null default '{"planning": true, "bouwplanning": true, "tekeningen": true, "fotos": true, "meerwerk": true}'::jsonb,
  can_edit_schedule boolean not null default false,
  created_at timestamptz not null default now()
);

-- Koppelt een Supabase Auth-gebruiker aan een rol en (indien van
-- toepassing) een team- of klantrecord. Wordt server-side aangemaakt
-- bij het versturen van een uitnodiging (service role), niet door de
-- client zelf.
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role text not null check (role in ('eigenaar', 'team', 'klant')),
  name text not null,
  team_member_id uuid references team_members(id) on delete set null,
  client_id uuid references clients(id) on delete set null,
  created_at timestamptz not null default now(),
  constraint profile_role_link check (
    (role = 'team' and team_member_id is not null and client_id is null) or
    (role = 'klant' and client_id is not null and team_member_id is null) or
    (role = 'eigenaar' and team_member_id is null and client_id is null)
  )
);

create table projects (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  client_id uuid references clients(id) on delete set null,
  address text,
  status text not null default 'gepland' check (status in ('gepland', 'lopend', 'afgerond')),
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);

-- Expliciete project-toegang voor teamleden die niet "alle projecten" zien.
create table project_team_access (
  project_id uuid not null references projects(id) on delete cascade,
  team_member_id uuid not null references team_members(id) on delete cascade,
  primary key (project_id, team_member_id)
);

create table schedule_phases (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  title text not null,
  assignee text,
  start_date date not null,
  end_date date not null,
  created_at timestamptz not null default now(),
  constraint schedule_phase_dates check (end_date >= start_date)
);

create table tasks (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  phase_id uuid references schedule_phases(id) on delete set null,
  title text not null,
  assignee text,
  due_date date,
  done boolean not null default false,
  created_at timestamptz not null default now()
);

create table drawings (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  title text not null,
  note text,
  file_path text,
  file_type text check (file_type in ('image', 'pdf')),
  uploader_id uuid references auth.users(id),
  uploaded_by text,
  uploader_role text,
  team_visible boolean not null default false,
  client_visible boolean not null default false,
  reviewed boolean not null default false,
  created_at timestamptz not null default now()
);

create table photos (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  title text not null,
  category text not null default 'tijdens' check (category in ('voor', 'tijdens', 'na', 'oplevering')),
  note text,
  file_path text,
  file_type text check (file_type in ('image', 'pdf')),
  uploader_id uuid references auth.users(id),
  uploaded_by text,
  uploader_role text,
  team_visible boolean not null default false,
  client_visible boolean not null default false,
  reviewed boolean not null default false,
  created_at timestamptz not null default now()
);

create table extra_work (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  type text not null check (type in ('meerwerk', 'minderwerk')),
  description text not null,
  amount numeric(10, 2) not null check (amount >= 0),
  status text not null default 'open' check (status in ('open', 'akkoord', 'afgewezen')),
  explanation text,
  extra_days integer check (extra_days is null or extra_days >= 0),
  phase_id uuid references schedule_phases(id) on delete set null,
  schedule_cutoff date,
  schedule_applied boolean not null default false,
  approved_by text,
  approved_date date,
  rejected_by text,
  rejected_date date,
  signature_path text,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);

-- ============================================================
-- Helperfuncties (SECURITY DEFINER zodat ze veilig binnen RLS-policies
-- gebruikt kunnen worden zonder recursieve policy-lookups)
-- ============================================================

create or replace function current_profile_role()
returns text
language sql stable security definer
set search_path = public
as $$
  select role from profiles where id = auth.uid();
$$;

create or replace function current_team_member_id()
returns uuid
language sql stable security definer
set search_path = public
as $$
  select team_member_id from profiles where id = auth.uid();
$$;

create or replace function current_client_id()
returns uuid
language sql stable security definer
set search_path = public
as $$
  select client_id from profiles where id = auth.uid();
$$;

create or replace function current_profile_name()
returns text
language sql stable security definer
set search_path = public
as $$
  select name from profiles where id = auth.uid();
$$;

create or replace function is_owner()
returns boolean
language sql stable security definer
set search_path = public
as $$
  select coalesce(current_profile_role() = 'eigenaar', false);
$$;

create or replace function has_project_access(p_project_id uuid)
returns boolean
language sql stable security definer
set search_path = public
as $$
  select
    is_owner()
    or (
      current_profile_role() = 'team'
      and (
        coalesce((select sees_all_projects from team_members where id = current_team_member_id()), false)
        or exists (
          select 1 from project_team_access
          where project_id = p_project_id and team_member_id = current_team_member_id()
        )
      )
    )
    or (
      current_profile_role() = 'klant'
      and exists (select 1 from projects where id = p_project_id and client_id = current_client_id())
    );
$$;

-- module in ('planning','bouwplanning','tekeningen','fotos','meerwerk')
create or replace function has_module_access(p_project_id uuid, p_module text)
returns boolean
language sql stable security definer
set search_path = public
as $$
  select
    is_owner()
    or (
      current_profile_role() = 'team'
      and has_project_access(p_project_id)
      and coalesce((select (permissions ->> p_module)::boolean from team_members where id = current_team_member_id()), true)
    )
    or (
      current_profile_role() = 'klant'
      and has_project_access(p_project_id)
      and coalesce((select (permissions ->> p_module)::boolean from clients where id = current_client_id()), true)
    );
$$;

create or replace function can_edit_schedule(p_project_id uuid)
returns boolean
language sql stable security definer
set search_path = public
as $$
  select
    is_owner()
    or (
      current_profile_role() = 'team'
      and has_project_access(p_project_id)
      and coalesce((select can_edit_schedule from team_members where id = current_team_member_id()), false)
    )
    or (
      current_profile_role() = 'klant'
      and has_project_access(p_project_id)
      and coalesce((select can_edit_schedule from clients where id = current_client_id()), false)
    );
$$;

-- ============================================================
-- RLS inschakelen
-- ============================================================

alter table profiles enable row level security;
alter table team_members enable row level security;
alter table clients enable row level security;
alter table project_team_access enable row level security;
alter table projects enable row level security;
alter table schedule_phases enable row level security;
alter table tasks enable row level security;
alter table drawings enable row level security;
alter table photos enable row level security;
alter table extra_work enable row level security;

-- profiles: iedereen ziet zichzelf; eigenaar ziet iedereen (nodig voor
-- teambeheer-UI en om uitnodigingen te koppelen).
create policy profiles_select on profiles for select
  using (id = auth.uid() or is_owner());
-- Schrijven gebeurt uitsluitend server-side met de service role
-- (uitnodigingsflow) — bewust geen insert/update/delete policy voor
-- gewone gebruikers.

-- team_members: naam/vak zichtbaar voor alle ingelogde gebruikers
-- (nodig voor toewijzen-dropdowns); alleen eigenaar beheert.
create policy team_members_select on team_members for select
  using (auth.uid() is not null);
create policy team_members_write on team_members for all
  using (is_owner()) with check (is_owner());

-- clients: eigenaar en team zien alle klantnamen (projectkaarten);
-- een klant ziet alleen het eigen record.
create policy clients_select on clients for select
  using (is_owner() or current_profile_role() = 'team' or id = current_client_id());
create policy clients_write on clients for all
  using (is_owner()) with check (is_owner());

create policy project_team_access_select on project_team_access for select
  using (is_owner() or team_member_id = current_team_member_id());
create policy project_team_access_write on project_team_access for all
  using (is_owner()) with check (is_owner());

create policy projects_select on projects for select
  using (has_project_access(id));
create policy projects_insert on projects for insert
  with check (is_owner());
create policy projects_update on projects for update
  using (is_owner()) with check (is_owner());
create policy projects_delete on projects for delete
  using (is_owner());

create policy schedule_phases_select on schedule_phases for select
  using (has_project_access(project_id) and has_module_access(project_id, 'bouwplanning'));
create policy schedule_phases_write on schedule_phases for all
  using (has_project_access(project_id) and can_edit_schedule(project_id))
  with check (has_project_access(project_id) and can_edit_schedule(project_id));

create policy tasks_select on tasks for select
  using (has_project_access(project_id) and has_module_access(project_id, 'planning'));
create policy tasks_write on tasks for all
  using (
    has_project_access(project_id) and has_module_access(project_id, 'planning')
    and (is_owner() or current_profile_role() = 'team')
  )
  with check (
    has_project_access(project_id) and has_module_access(project_id, 'planning')
    and (is_owner() or current_profile_role() = 'team')
  );

-- drawings / photos: zichtbaar voor eigenaar altijd, voor de uploader
-- zelf altijd (ook voor review), en voor team/klant pas na review +
-- expliciete zichtbaarheid. Wijzigen (zichtbaarheid zetten) en
-- verwijderen is voorbehouden aan de eigenaar; uploaden mag iedereen
-- met module-toegang.
create policy drawings_select on drawings for select
  using (
    has_project_access(project_id) and has_module_access(project_id, 'tekeningen')
    and (
      is_owner()
      or uploader_id = auth.uid()
      or (current_profile_role() = 'team' and reviewed and team_visible)
      or (current_profile_role() = 'klant' and reviewed and client_visible)
    )
  );
create policy drawings_insert on drawings for insert
  with check (has_project_access(project_id) and has_module_access(project_id, 'tekeningen'));
create policy drawings_update on drawings for update
  using (is_owner()) with check (is_owner());
create policy drawings_delete on drawings for delete
  using (is_owner());

create policy photos_select on photos for select
  using (
    has_project_access(project_id) and has_module_access(project_id, 'fotos')
    and (
      is_owner()
      or uploader_id = auth.uid()
      or (current_profile_role() = 'team' and reviewed and team_visible)
      or (current_profile_role() = 'klant' and reviewed and client_visible)
    )
  );
create policy photos_insert on photos for insert
  with check (has_project_access(project_id) and has_module_access(project_id, 'fotos'));
create policy photos_update on photos for update
  using (is_owner()) with check (is_owner());
create policy photos_delete on photos for delete
  using (is_owner());

-- extra_work: open/afgewezen/akkoord-overgangen lopen bewust via de
-- RPC's approve_extra_work/reject_extra_work/reset_extra_work
-- hieronder (die de "eenmaal beslist ligt het vast"-regel afdwingen).
-- Directe UPDATE via de tabel is daarom alleen voor de eigenaar.
create policy extra_work_select on extra_work for select
  using (has_project_access(project_id) and has_module_access(project_id, 'meerwerk'));
create policy extra_work_insert on extra_work for insert
  with check (
    has_project_access(project_id) and has_module_access(project_id, 'meerwerk')
    and (is_owner() or current_profile_role() = 'team')
  );
create policy extra_work_update on extra_work for update
  using (is_owner()) with check (is_owner());
create policy extra_work_delete on extra_work for delete
  using (is_owner());

-- Nieuw meerwerk/minderwerk staat altijd op 'open' bij aanmaak, ongeacht
-- wat de client meestuurt.
create or replace function extra_work_force_open()
returns trigger
language plpgsql
as $$
begin
  new.status := 'open';
  new.approved_by := null;
  new.approved_date := null;
  new.rejected_by := null;
  new.rejected_date := null;
  new.schedule_applied := false;
  return new;
end;
$$;

create trigger extra_work_before_insert
  before insert on extra_work
  for each row execute function extra_work_force_open();

-- ============================================================
-- Bouwplanning-doorschuif + meerwerk-besluit als RPC's
-- ============================================================

create or replace function apply_phase_shift(p_project_id uuid, p_phase_id uuid, p_days int, p_cutoff date)
returns void
language plpgsql security definer
set search_path = public
as $$
begin
  if p_days = 0 or p_phase_id is null or p_cutoff is null then
    return;
  end if;
  -- De fase waar het meerwerk bij hoort wordt zelf verlengd.
  update schedule_phases
  set end_date = end_date + p_days
  where id = p_phase_id and project_id = p_project_id;
  -- Latere fases (start op of na de oorspronkelijke einddatum van die fase) schuiven volledig mee.
  update schedule_phases
  set start_date = start_date + p_days, end_date = end_date + p_days
  where project_id = p_project_id and id <> p_phase_id and start_date >= p_cutoff;
end;
$$;

create or replace function approve_extra_work(p_work_id uuid, p_signature_path text default null)
returns void
language plpgsql security definer
set search_path = public
as $$
declare
  w extra_work%rowtype;
  actor text;
begin
  select * into w from extra_work where id = p_work_id;
  if not found then
    raise exception 'Meer-/minderwerk niet gevonden.';
  end if;
  if not (has_project_access(w.project_id) and has_module_access(w.project_id, 'meerwerk')) then
    raise exception 'Geen toegang tot dit project.';
  end if;
  if not (is_owner() or current_profile_role() = 'klant') then
    raise exception 'Alleen de eigenaar of de klant kan meerwerk goedkeuren.';
  end if;
  if current_profile_role() = 'klant' and w.status <> 'open' then
    raise exception 'Dit voorstel is al afgehandeld en ligt vast.';
  end if;
  if current_profile_role() = 'klant' and p_signature_path is null then
    raise exception 'Een handtekening is verplicht om akkoord te geven.';
  end if;

  actor := coalesce(current_profile_name(), 'Onbekend');

  if w.extra_days > 0 and w.phase_id is not null and not w.schedule_applied then
    perform apply_phase_shift(w.project_id, w.phase_id, w.extra_days, w.schedule_cutoff);
  end if;

  update extra_work set
    status = 'akkoord',
    approved_by = actor,
    approved_date = current_date,
    rejected_by = null,
    rejected_date = null,
    signature_path = coalesce(p_signature_path, w.signature_path),
    schedule_applied = case when w.extra_days > 0 and w.phase_id is not null then true else schedule_applied end
  where id = p_work_id;
end;
$$;

create or replace function reject_extra_work(p_work_id uuid)
returns void
language plpgsql security definer
set search_path = public
as $$
declare
  w extra_work%rowtype;
  actor text;
begin
  select * into w from extra_work where id = p_work_id;
  if not found then
    raise exception 'Meer-/minderwerk niet gevonden.';
  end if;
  if not (has_project_access(w.project_id) and has_module_access(w.project_id, 'meerwerk')) then
    raise exception 'Geen toegang tot dit project.';
  end if;
  if not (is_owner() or current_profile_role() = 'klant') then
    raise exception 'Alleen de eigenaar of de klant kan meerwerk afwijzen.';
  end if;
  if current_profile_role() = 'klant' and w.status <> 'open' then
    raise exception 'Dit voorstel is al afgehandeld en ligt vast.';
  end if;

  actor := coalesce(current_profile_name(), 'Onbekend');

  if w.schedule_applied and w.extra_days > 0 and w.phase_id is not null then
    perform apply_phase_shift(w.project_id, w.phase_id, -w.extra_days, w.schedule_cutoff);
  end if;

  update extra_work set
    status = 'afgewezen',
    rejected_by = actor,
    rejected_date = current_date,
    approved_by = null,
    approved_date = null,
    schedule_applied = false
  where id = p_work_id;
end;
$$;

-- Alleen de eigenaar kan een besluit terugdraaien naar 'open'.
create or replace function reset_extra_work(p_work_id uuid)
returns void
language plpgsql security definer
set search_path = public
as $$
declare
  w extra_work%rowtype;
begin
  select * into w from extra_work where id = p_work_id;
  if not found then
    raise exception 'Meer-/minderwerk niet gevonden.';
  end if;
  if not is_owner() then
    raise exception 'Alleen de eigenaar kan een besluit terugdraaien.';
  end if;

  if w.schedule_applied and w.extra_days > 0 and w.phase_id is not null then
    perform apply_phase_shift(w.project_id, w.phase_id, -w.extra_days, w.schedule_cutoff);
  end if;

  update extra_work set
    status = 'open',
    approved_by = null,
    approved_date = null,
    rejected_by = null,
    rejected_date = null,
    schedule_applied = false
  where id = p_work_id;
end;
$$;

-- ============================================================
-- Storage: één bucket, pad-conventie {project_id}/{map}/{bestand}
-- waarbij map in ('drawings', 'photos', 'signatures').
-- ============================================================

insert into storage.buckets (id, name, public)
values ('project-files', 'project-files', false)
on conflict (id) do nothing;

create or replace function storage_module_key(p_folder text)
returns text
language sql immutable
as $$
  select case p_folder
    when 'drawings' then 'tekeningen'
    when 'photos' then 'fotos'
    when 'signatures' then 'meerwerk'
    else null
  end;
$$;

create policy project_files_select on storage.objects for select
  using (
    bucket_id = 'project-files'
    and has_project_access((storage.foldername(name))[1]::uuid)
    and has_module_access((storage.foldername(name))[1]::uuid, storage_module_key((storage.foldername(name))[2]))
  );

create policy project_files_insert on storage.objects for insert
  with check (
    bucket_id = 'project-files'
    and has_project_access((storage.foldername(name))[1]::uuid)
    and has_module_access((storage.foldername(name))[1]::uuid, storage_module_key((storage.foldername(name))[2]))
  );

create policy project_files_delete on storage.objects for delete
  using (
    bucket_id = 'project-files'
    and is_owner()
  );

-- ============================================================
-- Eerste eigenaarsaccount
-- ============================================================
-- Er is bewust geen self-signup. Maak het eerste account aan via
-- Supabase Auth (dashboard of `supabase auth admin` CLI), en koppel
-- het daarna aan de eigenaar-rol, bv.:
--
--   insert into profiles (id, role, name)
--   values ('<auth-user-uuid>', 'eigenaar', 'Rody van Essen');
--
-- Team- en klantaccounts verlopen via de uitnodigingsflow in de app
-- (Instellingen → Team / Klanten), die dit voor je doet met de
-- service role key.
