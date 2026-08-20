-- De hele subsidiemodule (meldcodedatabase, subsidiecheck, bewijs-
-- bijlagen, machtiging) is nu strikt eigenaar-only — team heeft hier
-- geen taak in en mag er dus ook op databaseniveau niet bij, niet alleen
-- via de UI verstopt.
drop policy if exists subsidy_products_select on subsidy_products;
create policy subsidy_products_select on subsidy_products
  for select using (is_owner());

drop policy if exists subsidy_check_items_all on subsidy_check_items;
create policy subsidy_check_items_all on subsidy_check_items
  for all using (has_project_access(project_id) and is_owner())
  with check (has_project_access(project_id) and is_owner());

drop policy if exists subsidy_check_item_photos_all on subsidy_check_item_photos;
create policy subsidy_check_item_photos_all on subsidy_check_item_photos
  for all using (has_project_access(project_id) and is_owner())
  with check (has_project_access(project_id) and is_owner());

-- Machtiging: select/update blijven wel open voor de klant zelf (die
-- moet zijn eigen machtiging kunnen zien en ondertekenen), maar niet
-- meer voor team. Aanvragen/intrekken blijft eigenaar-only.
drop policy if exists subsidy_authorizations_select on subsidy_authorizations;
create policy subsidy_authorizations_select on subsidy_authorizations
  for select using (is_owner() or (current_profile_role() = 'klant' and has_project_access(project_id)));

drop policy if exists subsidy_authorizations_insert on subsidy_authorizations;
create policy subsidy_authorizations_insert on subsidy_authorizations
  for insert with check (has_project_access(project_id) and is_owner());

drop policy if exists subsidy_authorizations_delete on subsidy_authorizations;
create policy subsidy_authorizations_delete on subsidy_authorizations
  for delete using (has_project_access(project_id) and is_owner());

drop policy if exists subsidy_authorizations_update on subsidy_authorizations;
create policy subsidy_authorizations_update on subsidy_authorizations
  for update using (is_owner() or (current_profile_role() = 'klant' and has_project_access(project_id)))
  with check (is_owner() or (current_profile_role() = 'klant' and has_project_access(project_id)));
