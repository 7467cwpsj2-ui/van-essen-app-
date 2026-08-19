-- Voor nu: een project mag aan maximaal 2 klanten gekoppeld worden (de
-- primaire klant via projects.client_id, plus maximaal 1 extra via
-- project_client_access). De app checkt dit al vóór het aanmaken van de
-- koppeling, maar deze trigger is het veiligheidsnet in de database
-- zelf (bv. bij handmatig werk in de Supabase SQL Editor).
create or replace function enforce_project_client_limit()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  current_count int;
begin
  select
    (case when p.client_id is not null then 1 else 0 end)
    + (select count(*) from project_client_access where project_id = new.project_id)
  into current_count
  from projects p
  where p.id = new.project_id;

  if coalesce(current_count, 0) >= 2 then
    raise exception 'Een project kan aan maximaal 2 klanten gekoppeld worden.';
  end if;
  return new;
end;
$$;

drop trigger if exists project_client_access_limit on project_client_access;
create trigger project_client_access_limit
  before insert on project_client_access
  for each row execute function enforce_project_client_limit();
