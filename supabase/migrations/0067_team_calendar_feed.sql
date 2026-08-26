-- Agenda-koppeling (iCal-abonnement): een teamlid (of de eigenaar via
-- zijn eigen-personeel-koppeling, migratie 0061) kan zijn ingeplande
-- klussen/projecten laten meelopen in zijn eigen telefoon-agenda,
-- zonder steeds de app te hoeven openen. Zelfde patroon als de
-- deelbare opleverdossier-link (dossier_share_token): een
-- niet-raadbaar token, geen sessie nodig om de feed op te halen.
alter table team_members add column calendar_token uuid;
create unique index team_members_calendar_token_key on team_members(calendar_token) where calendar_token is not null;
