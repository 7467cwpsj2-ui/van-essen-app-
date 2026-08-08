-- De dagen bij meer-/minderwerk (die de bouwplanning verschuiven zodra
-- de klant akkoord geeft) tellen voortaan in werkdagen — een weekend
-- binnen die verschuiving telt niet mee, dus de fase (en alles erna)
-- schuift verder op in kalenderdagen dan het ingevulde aantal als er
-- een weekend tussen zit.

create or replace function add_working_days(p_date date, p_working_days int)
returns date
language plpgsql
immutable
as $$
declare
  d date := p_date;
  remaining int := abs(p_working_days);
  step int := case when p_working_days >= 0 then 1 else -1 end;
begin
  if p_working_days = 0 then
    return p_date;
  end if;
  while remaining > 0 loop
    d := d + step;
    -- isodow: 1 = maandag .. 5 = vrijdag, 6 = zaterdag, 7 = zondag
    if extract(isodow from d) < 6 then
      remaining := remaining - 1;
    end if;
  end loop;
  return d;
end;
$$;

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
  -- met p_days werkdagen (weekend telt niet mee).
  update schedule_phases
  set end_date = new_end
  where id = p_phase_id and project_id = p_project_id;

  -- Latere fases (start op of na de oorspronkelijke einddatum van die
  -- fase) schuiven volledig mee, met dezelfde kalenderdagen-verschuiving.
  update schedule_phases
  set start_date = start_date + calendar_delta, end_date = end_date + calendar_delta
  where project_id = p_project_id and id <> p_phase_id and start_date >= p_cutoff;
end;
$$;
