-- De select-policy op project_client_access was te strak: een klant zag
-- alleen zijn eigen koppelrij, niet die van een eventuele tweede klant
-- op hetzelfde project. Daardoor toonde bijvoorbeeld het opleverdossier
-- voor die klant alleen zijn eigen naam i.p.v. "Klant A & Klant B".
-- Iedereen met toegang tot het project (eigenaar, team, elke gekoppelde
-- klant) mag nu de volledige koppellijst van dat project zien.
drop policy if exists project_client_access_select on project_client_access;
create policy project_client_access_select on project_client_access
  for select using (is_owner() or has_project_access(project_id));
