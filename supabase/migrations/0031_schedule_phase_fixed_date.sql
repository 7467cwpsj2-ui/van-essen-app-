-- Sommige fases kunnen niet meer verplaatst worden (bijvoorbeeld een
-- vaste levering, een keuring, of een onderaannemer met beperkte
-- beschikbaarheid) — die moeten op hun datum blijven staan, ook als
-- meerwerk of een handmatige aanpassing de rest van de planning laat
-- opschuiven. Rechtstreeks bewerken van zo'n fase zelf blijft gewoon
-- mogelijk; alleen het automatisch meeschuiven door een wijziging
-- elders wordt overgeslagen.
alter table schedule_phases add column if not exists fixed_date boolean not null default false;

create or replace function apply_phase_shift(p_project_id uuid, p_phase_id uuid, p_days int, p_cutoff date)
returns void
language plpgsql security definer
set search_path = public
as $$
declare
  old_end date;
  new_end date;
  calendar_delta int;
begin
  if p_days = 0 or p_phase_id is null or p_cutoff is null then
    return;
  end if;

  select end_date into old_end from schedule_phases where id = p_phase_id and project_id = p_project_id;
  if old_end is null then
    return;
  end if;

  new_end := add_working_days(old_end, p_days);
  calendar_delta := new_end - old_end;

  -- De fase waar het meerwerk bij hoort wordt zelf verlengd/verkort,
  -- ongeacht fixed_date — dit is een directe aanpassing, geen cascade.
  update schedule_phases
  set end_date = new_end
  where id = p_phase_id and project_id = p_project_id;

  -- Latere fases schuiven mee, behalve fases die op een vaste datum
  -- moeten blijven staan.
  update schedule_phases
  set start_date = start_date + calendar_delta, end_date = end_date + calendar_delta
  where project_id = p_project_id and id <> p_phase_id and start_date >= p_cutoff and not fixed_date;
end;
$$;
