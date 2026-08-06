-- Notities krijgen dezelfde review-stap als tekeningen/foto's: de
-- eigenaar krijgt expliciet de keuze te maken zodra een klant- of
-- teamnotitie de grens van "alleen ik" wil overschrijden.

alter table notes add column reviewed boolean not null default true;

-- Bestaande notities zijn al "gezien" (dit is een nieuwe feature op
-- bestaande data) — alleen nieuwe notities van klant/team starten
-- voortaan als niet-gereviewd, geregeld door de trigger hieronder.

create or replace function notes_enforce_visibility()
returns trigger
language plpgsql
as $$
begin
  if is_owner() then
    new.reviewed := true;
    return new;
  elsif current_profile_role() = 'team' then
    if new.visibility = 'klant' then
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
