-- Meer- én minderwerk kunnen nu allebei de bouwplanning verschuiven
-- zodra de klant akkoord geeft: meerwerk verlengt de gekozen fase,
-- minderwerk verkort 'm (negatieve extra_days). Voorheen kon dit
-- alleen bij meerwerk, en alleen als de eigenaar het aanmaakte.

alter table extra_work drop constraint if exists extra_work_extra_days_check;
alter table extra_work add constraint extra_work_extra_days_check check (extra_days is null or extra_days <> 0);

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

  if w.extra_days is not null and w.extra_days <> 0 and w.phase_id is not null and not w.schedule_applied then
    perform apply_phase_shift(w.project_id, w.phase_id, w.extra_days, w.schedule_cutoff);
  end if;

  update extra_work set
    status = 'akkoord',
    approved_by = actor,
    approved_date = current_date,
    rejected_by = null,
    rejected_date = null,
    signature_path = coalesce(p_signature_path, w.signature_path),
    schedule_applied = case when w.extra_days is not null and w.extra_days <> 0 and w.phase_id is not null then true else schedule_applied end
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

  if w.schedule_applied and w.extra_days is not null and w.extra_days <> 0 and w.phase_id is not null then
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
  if not is_owner() then
    raise exception 'Alleen de eigenaar kan een besluit terugdraaien.';
  end if;

  if w.schedule_applied and w.extra_days is not null and w.extra_days <> 0 and w.phase_id is not null then
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
