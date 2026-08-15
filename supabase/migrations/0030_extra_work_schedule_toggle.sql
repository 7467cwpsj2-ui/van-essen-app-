-- Los van de akkoord/afwijs-status: de eigenaar wil de
-- bouwplanning-verschuiving van een AL akkoord meerwerk-item soms apart
-- kunnen terugdraaien (bijvoorbeeld als het werk toch sneller kon dan
-- gepland), zonder dat de financiële goedkeuring of de "+3 dagen"-tekst
-- die de klant ziet daarbij verandert.
create or replace function toggle_extra_work_schedule(p_work_id uuid, p_apply boolean)
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
    raise exception 'Alleen de eigenaar kan de bouwplanning-aanpassing terugdraaien.';
  end if;
  if w.extra_days is null or w.extra_days = 0 or w.phase_id is null then
    raise exception 'Er zijn voor dit item geen dagen aan de bouwplanning gekoppeld.';
  end if;
  if p_apply = w.schedule_applied then
    return;
  end if;

  if p_apply then
    perform apply_phase_shift(w.project_id, w.phase_id, w.extra_days, w.schedule_cutoff);
  else
    perform apply_phase_shift(w.project_id, w.phase_id, -w.extra_days, w.schedule_cutoff);
  end if;

  update extra_work set schedule_applied = p_apply where id = p_work_id;
end;
$$;
