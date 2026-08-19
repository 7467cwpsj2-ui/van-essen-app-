-- Bugfix: een klant die (bv. door een dubbele tik op "Bevestigen" bij
-- het ondertekenen) een al goedgekeurd voorstel nogmaals probeert te
-- accepteren, kreeg een harde SQL-foutmelding die de pagina liet
-- crashen ("Dit voorstel is al afgehandeld en ligt vast"). Een tweede
-- akkoord op hetzelfde voorstel is feitelijk geen probleem — de klant
-- wilde toch al akkoord geven — dus die situatie wordt nu stil
-- genegeerd (idempotent) in plaats van een fout te geven. Alleen een
-- poging om een al afgewezen voorstel alsnog te accepteren blijft een
-- harde fout, want dat is een echte tegenstrijdige actie.
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
  if current_profile_role() = 'klant' and w.status = 'akkoord' then
    return;
  end if;
  if current_profile_role() = 'klant' and w.status = 'afgewezen' then
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

-- Zelfde idempotentie-fix voor afwijzen: een dubbele tik op "Afwijzen"
-- op een al afgewezen voorstel wordt nu ook stil genegeerd.
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
  if current_profile_role() = 'klant' and w.status = 'afgewezen' then
    return;
  end if;
  if current_profile_role() = 'klant' and w.status = 'akkoord' then
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
