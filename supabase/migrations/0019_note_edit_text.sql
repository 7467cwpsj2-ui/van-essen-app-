-- Een notitie kan achteraf bewerkt worden (bijv. een typefout na het
-- delen) door de auteur zelf of de eigenaar. Een niet-eigenaar mag
-- alleen de tekst wijzigen — deze trigger zet elk ander veld (o.a.
-- zichtbaarheid) stiekem terug naar de oude waarde als iemand anders
-- dan de eigenaar de update doet, zodat de bestaande review-regels
-- (alleen eigenaar mag zichtbaarheid wijzigen) niet omzeild kunnen
-- worden via deze nieuwe update-policy.

create or replace function notes_restrict_author_update()
returns trigger
language plpgsql
as $$
begin
  if not is_owner() then
    new.visibility := old.visibility;
    new.visible_team_member_ids := old.visible_team_member_ids;
    new.reviewed := old.reviewed;
    new.author_id := old.author_id;
    new.author_name := old.author_name;
    new.project_id := old.project_id;
    new.created_at := old.created_at;
  end if;
  return new;
end;
$$;

create trigger notes_before_update
  before update on notes
  for each row execute function notes_restrict_author_update();

drop policy if exists notes_update on notes;
create policy notes_update on notes for update
  using (
    has_project_access(project_id) and has_module_access(project_id, 'notities')
    and not is_project_locked(project_id)
    and (is_owner() or author_id = auth.uid())
  )
  with check (has_project_access(project_id));
