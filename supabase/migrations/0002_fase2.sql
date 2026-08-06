-- Van Essen Bouw & Onderhoud — Fase 2 schema
--
-- Voegt toe: chat (groep + privé eigenaar-klant), notities, opleverpunten,
-- klantkeuzes, en het opleverdossier (incl. garantie-items en de
-- afsluitende handtekening die het project vergrendelt).
--
-- Bewust nog niet in dit schema: uren, veiligheid, financieel/
-- nacalculatie (los van het offertebedrag dat het opleverdossier nodig
-- heeft), sjablonen.

-- ============================================================
-- Projecten uitbreiden met opleverdossier-velden
-- ============================================================

alter table projects
  add column quote_amount numeric(10, 2) not null default 0,
  add column delivery_ready boolean not null default false,
  add column delivery_date date,
  add column warranty_text text,
  add column delivery_signed_at timestamptz,
  add column delivery_signed_by text,
  add column delivery_signature_path text;

create or replace function is_project_locked(p_project_id uuid)
returns boolean
language sql stable security definer
set search_path = public
as $$
  select coalesce((select delivery_signed_at is not null from projects where id = p_project_id), false);
$$;

-- ============================================================
-- Nieuwe tabellen
-- ============================================================

create table notes (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  text text not null,
  author_id uuid references auth.users(id),
  author_name text,
  visibility text not null default 'prive' check (visibility in ('prive', 'team', 'klant')),
  created_at timestamptz not null default now()
);

create table completion_points (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  description text not null,
  responsible_team_member_id uuid references team_members(id) on delete set null,
  responsible_name text,
  deadline date,
  status text not null default 'open' check (status in ('open', 'gereed', 'goedgekeurd')),
  created_at timestamptz not null default now()
);

create table client_choices (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  category text not null,
  description text,
  deadline date,
  status text not null default 'open' check (status in ('open', 'gekozen', 'afgewezen')),
  choice_text text,
  decided_at date,
  created_at timestamptz not null default now()
);

create table warranty_items (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  item text not null,
  amount integer not null check (amount > 0),
  unit text not null check (unit in ('weken', 'maanden', 'jaren')),
  created_at timestamptz not null default now()
);

create table chat_messages (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  author_id uuid references auth.users(id),
  author_name text,
  text text not null,
  created_at timestamptz not null default now()
);

-- Privéchat tussen eigenaar en klant — nooit zichtbaar voor team, dit is
-- een harde regel (geen module-toggle, net als uren/veiligheid dat
-- straks zullen zijn).
create table owner_client_messages (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  author_id uuid references auth.users(id),
  author_name text,
  text text not null,
  created_at timestamptz not null default now()
);

-- ============================================================
-- RLS
-- ============================================================

alter table notes enable row level security;
alter table completion_points enable row level security;
alter table client_choices enable row level security;
alter table warranty_items enable row level security;
alter table chat_messages enable row level security;
alter table owner_client_messages enable row level security;

-- notes: eigenaar ziet alles; auteur ziet altijd zijn eigen notitie
-- (ook als die 'prive' is); team ziet 'team'-notities, klant ziet
-- 'klant'-notities. Alleen eigenaar wijzigt zichtbaarheid; auteur of
-- eigenaar mag verwijderen.
create policy notes_select on notes for select
  using (
    has_project_access(project_id) and has_module_access(project_id, 'notities')
    and (
      is_owner()
      or author_id = auth.uid()
      or (current_profile_role() = 'team' and visibility = 'team')
      or (current_profile_role() = 'klant' and visibility = 'klant')
    )
  );
create policy notes_insert on notes for insert
  with check (
    has_project_access(project_id) and has_module_access(project_id, 'notities')
    and not is_project_locked(project_id)
    and author_id = auth.uid()
  );
create policy notes_update on notes for update
  using (is_owner()) with check (is_owner());
create policy notes_delete on notes for delete
  using (is_owner() or author_id = auth.uid());

-- Notitie-zichtbaarheid bij aanmaak afdwingen op basis van rol: klant
-- mag alleen 'prive' aanmaken, team mag 'prive' of 'team' (nooit
-- rechtstreeks 'klant'), alleen eigenaar mag direct op 'klant' zetten.
create or replace function notes_enforce_visibility()
returns trigger
language plpgsql
as $$
begin
  if is_owner() then
    return new;
  elsif current_profile_role() = 'team' then
    if new.visibility = 'klant' then
      new.visibility := 'team';
    end if;
  else
    new.visibility := 'prive';
  end if;
  return new;
end;
$$;

create trigger notes_before_insert
  before insert on notes
  for each row execute function notes_enforce_visibility();

-- completion_points: iedereen met toegang ziet ze; alleen eigenaar
-- voegt toe/verwijdert; status 'gereed' mag alleen de verantwoordelijke
-- (of eigenaar) zetten zolang die nog 'open' is, 'goedgekeurd' alleen
-- de klant (of eigenaar) zolang die 'gereed' is.
create policy completion_points_select on completion_points for select
  using (has_project_access(project_id) and has_module_access(project_id, 'opleverpunten'));
create policy completion_points_insert on completion_points for insert
  with check (
    has_project_access(project_id) and has_module_access(project_id, 'opleverpunten')
    and not is_project_locked(project_id) and is_owner()
  );
create policy completion_points_update on completion_points for update
  using (
    has_project_access(project_id) and has_module_access(project_id, 'opleverpunten') and not is_project_locked(project_id)
    and (
      is_owner()
      or (current_profile_role() = 'team' and status = 'open' and responsible_team_member_id = current_team_member_id())
      or (current_profile_role() = 'klant' and status = 'gereed')
    )
  )
  with check (has_project_access(project_id));
create policy completion_points_delete on completion_points for delete
  using (is_owner() and not is_project_locked(project_id));

-- client_choices: klant beslist zelf (eenmaal beslist ligt het vast,
-- tenzij de eigenaar het terugzet).
create policy client_choices_select on client_choices for select
  using (has_project_access(project_id) and has_module_access(project_id, 'klantkeuzes'));
create policy client_choices_insert on client_choices for insert
  with check (
    has_project_access(project_id) and has_module_access(project_id, 'klantkeuzes')
    and not is_project_locked(project_id) and (is_owner() or current_profile_role() = 'team')
  );
create policy client_choices_update on client_choices for update
  using (
    has_project_access(project_id) and has_module_access(project_id, 'klantkeuzes') and not is_project_locked(project_id)
    and (is_owner() or (current_profile_role() = 'klant' and status = 'open'))
  )
  with check (has_project_access(project_id));
create policy client_choices_delete on client_choices for delete
  using (is_owner() and not is_project_locked(project_id));

-- warranty_items: alleen eigenaar beheert, iedereen met toegang ziet ze.
create policy warranty_items_select on warranty_items for select
  using (has_project_access(project_id) and has_module_access(project_id, 'dossier'));
create policy warranty_items_write on warranty_items for all
  using (is_owner() and not is_project_locked(project_id))
  with check (is_owner() and not is_project_locked(project_id));

-- chat_messages: groepschat, iedereen met toegang leest/schrijft; alleen
-- eigenaar of de auteur verwijdert.
create policy chat_messages_select on chat_messages for select
  using (has_project_access(project_id) and has_module_access(project_id, 'chat'));
create policy chat_messages_insert on chat_messages for insert
  with check (has_project_access(project_id) and has_module_access(project_id, 'chat') and author_id = auth.uid());
create policy chat_messages_delete on chat_messages for delete
  using (is_owner() or author_id = auth.uid());

-- owner_client_messages: harde regel, nooit team. Geen module-toggle.
create policy owner_client_messages_select on owner_client_messages for select
  using (
    (is_owner() or (current_profile_role() = 'klant' and has_project_access(project_id)))
  );
create policy owner_client_messages_insert on owner_client_messages for insert
  with check (
    (is_owner() or (current_profile_role() = 'klant' and has_project_access(project_id)))
    and author_id = auth.uid()
  );
create policy owner_client_messages_delete on owner_client_messages for delete
  using (is_owner() or author_id = auth.uid());

-- ============================================================
-- Vergrendeling: bestaande fase-1 schrijfrechten uitbreiden zodat een
-- ondertekend opleverdossier écht niets meer laat wijzigen.
-- ============================================================

drop policy if exists projects_update on projects;
create policy projects_update on projects for update
  using (is_owner() and not is_project_locked(id)) with check (is_owner());

drop policy if exists schedule_phases_write on schedule_phases;
create policy schedule_phases_write on schedule_phases for all
  using (has_project_access(project_id) and can_edit_schedule(project_id) and not is_project_locked(project_id))
  with check (has_project_access(project_id) and can_edit_schedule(project_id) and not is_project_locked(project_id));

drop policy if exists tasks_write on tasks;
create policy tasks_write on tasks for all
  using (
    has_project_access(project_id) and has_module_access(project_id, 'planning') and not is_project_locked(project_id)
    and (is_owner() or current_profile_role() = 'team')
  )
  with check (
    has_project_access(project_id) and has_module_access(project_id, 'planning') and not is_project_locked(project_id)
    and (is_owner() or current_profile_role() = 'team')
  );

drop policy if exists drawings_insert on drawings;
create policy drawings_insert on drawings for insert
  with check (has_project_access(project_id) and has_module_access(project_id, 'tekeningen') and not is_project_locked(project_id));

drop policy if exists photos_insert on photos;
create policy photos_insert on photos for insert
  with check (has_project_access(project_id) and has_module_access(project_id, 'fotos') and not is_project_locked(project_id));

drop policy if exists extra_work_insert on extra_work;
create policy extra_work_insert on extra_work for insert
  with check (
    has_project_access(project_id) and has_module_access(project_id, 'meerwerk') and not is_project_locked(project_id)
    and (is_owner() or current_profile_role() = 'team')
  );

drop policy if exists extra_work_update on extra_work;
create policy extra_work_update on extra_work for update
  using (is_owner() and not is_project_locked(project_id)) with check (is_owner());

drop policy if exists extra_work_delete on extra_work;
create policy extra_work_delete on extra_work for delete
  using (is_owner() and not is_project_locked(project_id));

drop policy if exists drawings_update on drawings;
create policy drawings_update on drawings for update
  using (is_owner() and not is_project_locked(project_id)) with check (is_owner());

drop policy if exists drawings_delete on drawings;
create policy drawings_delete on drawings for delete
  using (is_owner() and not is_project_locked(project_id));

drop policy if exists photos_update on photos;
create policy photos_update on photos for update
  using (is_owner() and not is_project_locked(project_id)) with check (is_owner());

drop policy if exists photos_delete on photos;
create policy photos_delete on photos for delete
  using (is_owner() and not is_project_locked(project_id));

-- ============================================================
-- Fase-1 meerwerk-RPC's: ook deze respecteren nu de vergrendeling.
-- ============================================================

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
  if is_project_locked(w.project_id) then
    raise exception 'Het opleverdossier is ondertekend en vergrendeld.';
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
  if is_project_locked(w.project_id) then
    raise exception 'Het opleverdossier is ondertekend en vergrendeld.';
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
  if is_project_locked(w.project_id) then
    raise exception 'Het opleverdossier is ondertekend en vergrendeld.';
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
-- RPC's: opleverpunten, klantkeuzes, opleverdossier-ondertekening
-- ============================================================

create or replace function mark_completion_point_ready(p_id uuid)
returns void
language plpgsql security definer
set search_path = public
as $$
declare
  cp completion_points%rowtype;
begin
  select * into cp from completion_points where id = p_id;
  if not found then raise exception 'Opleverpunt niet gevonden.'; end if;
  if is_project_locked(cp.project_id) then raise exception 'Het opleverdossier is ondertekend en vergrendeld.'; end if;
  if not (is_owner() or (current_profile_role() = 'team' and current_team_member_id() = cp.responsible_team_member_id)) then
    raise exception 'Alleen de verantwoordelijke of de eigenaar kan dit gereed melden.';
  end if;
  update completion_points set status = 'gereed' where id = p_id;
end;
$$;

create or replace function approve_completion_point(p_id uuid)
returns void
language plpgsql security definer
set search_path = public
as $$
declare
  cp completion_points%rowtype;
begin
  select * into cp from completion_points where id = p_id;
  if not found then raise exception 'Opleverpunt niet gevonden.'; end if;
  if is_project_locked(cp.project_id) then raise exception 'Het opleverdossier is ondertekend en vergrendeld.'; end if;
  if not (is_owner() or current_profile_role() = 'klant') then raise exception 'Alleen de klant of de eigenaar keurt dit goed.'; end if;
  if cp.status <> 'gereed' then raise exception 'Dit punt is nog niet gereed gemeld.'; end if;
  update completion_points set status = 'goedgekeurd' where id = p_id;
end;
$$;

create or replace function reset_completion_point(p_id uuid)
returns void
language plpgsql security definer
set search_path = public
as $$
declare
  cp completion_points%rowtype;
begin
  select * into cp from completion_points where id = p_id;
  if not found then raise exception 'Opleverpunt niet gevonden.'; end if;
  if not is_owner() then raise exception 'Alleen de eigenaar kan dit terugzetten.'; end if;
  update completion_points set status = 'open' where id = p_id;
end;
$$;

create or replace function decide_client_choice(p_id uuid, p_status text, p_choice_text text default null)
returns void
language plpgsql security definer
set search_path = public
as $$
declare
  cc client_choices%rowtype;
begin
  if p_status not in ('gekozen', 'afgewezen') then raise exception 'Ongeldige status.'; end if;
  select * into cc from client_choices where id = p_id;
  if not found then raise exception 'Klantkeuze niet gevonden.'; end if;
  if is_project_locked(cc.project_id) then raise exception 'Het opleverdossier is ondertekend en vergrendeld.'; end if;
  if not (is_owner() or current_profile_role() = 'klant') then raise exception 'Alleen de klant of de eigenaar beslist.'; end if;
  if current_profile_role() = 'klant' and cc.status <> 'open' then raise exception 'Deze keuze is al vastgelegd.'; end if;
  update client_choices set status = p_status, choice_text = coalesce(p_choice_text, choice_text), decided_at = current_date
  where id = p_id;
end;
$$;

create or replace function reset_client_choice(p_id uuid)
returns void
language plpgsql security definer
set search_path = public
as $$
begin
  if not is_owner() then raise exception 'Alleen de eigenaar kan dit terugzetten.'; end if;
  update client_choices set status = 'open', choice_text = null, decided_at = null where id = p_id;
end;
$$;

-- Ondertekenen sluit het project af: status -> 'afgerond', en het
-- dossier (en daarmee het hele project) wordt permanent vergrendeld.
create or replace function sign_delivery(p_project_id uuid, p_signature_path text)
returns void
language plpgsql security definer
set search_path = public
as $$
declare
  actor text;
begin
  if not has_project_access(p_project_id) then raise exception 'Geen toegang tot dit project.'; end if;
  if not (is_owner() or current_profile_role() = 'klant') then
    raise exception 'Alleen de klant of de eigenaar kan het opleverdossier ondertekenen.';
  end if;
  if is_project_locked(p_project_id) then raise exception 'Dit dossier is al ondertekend.'; end if;
  if p_signature_path is null then raise exception 'Een handtekening is verplicht.'; end if;

  actor := coalesce(current_profile_name(), 'Onbekend');

  update projects set
    delivery_signed_at = now(),
    delivery_signed_by = actor,
    delivery_signature_path = p_signature_path,
    status = 'afgerond'
  where id = p_project_id;
end;
$$;

-- ============================================================
-- Storage: handtekening bij oplevering hergebruikt dezelfde bucket,
-- in een aparte map die aan de 'dossier'-module hangt.
-- ============================================================

create or replace function storage_module_key(p_folder text)
returns text
language sql immutable
as $$
  select case p_folder
    when 'drawings' then 'tekeningen'
    when 'photos' then 'fotos'
    when 'signatures' then 'meerwerk'
    when 'delivery' then 'dossier'
    else null
  end;
$$;
