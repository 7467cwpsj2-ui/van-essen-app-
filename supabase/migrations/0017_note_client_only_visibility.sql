-- Notitie kan nu ook uitsluitend met de klant gedeeld worden (dus niet
-- met het team) — naast de bestaande opties "alleen ik", "team" en
-- "team + klant".

alter table notes drop constraint notes_visibility_check;
alter table notes add constraint notes_visibility_check
  check (visibility in ('prive', 'team', 'klant', 'alleen_klant'));

drop policy if exists notes_select on notes;
create policy notes_select on notes for select
  using (
    has_project_access(project_id) and has_module_access(project_id, 'notities')
    and (
      is_owner()
      or author_id = auth.uid()
      or (current_profile_role() = 'team' and visibility = 'team')
      or (current_profile_role() = 'klant' and visibility in ('klant', 'alleen_klant'))
    )
  );

-- Alleen de eigenaar mag een notitie rechtstreeks alleen-klant maken;
-- een teamlid dat dit probeert (of "team + klant") krijgt 'm net als
-- voorheen teruggezet naar gewoon "team", ter beoordeling door de
-- eigenaar.
create or replace function notes_enforce_visibility()
returns trigger
language plpgsql
as $$
begin
  if is_owner() then
    new.reviewed := true;
    return new;
  elsif current_profile_role() = 'team' then
    if new.visibility in ('klant', 'alleen_klant') then
      new.visibility := 'team';
    end if;
    new.reviewed := false;
  else
    new.visibility := 'prive';
    new.reviewed := false;
  end if;
  return new;
end;
$$;
