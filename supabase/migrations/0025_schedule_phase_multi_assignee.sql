-- Meerdere eigen personeelsleden op dezelfde bouwplanningsfase kunnen
-- inplannen. `assignee` (vrije tekst) blijft bestaan voor onderaannemers
-- / externe namen die niet als teamlid geregistreerd staan; deze nieuwe
-- kolom wordt gebruikt zodra er specifiek eigen personeel gekozen wordt.
alter table schedule_phases add column if not exists assignee_team_member_ids uuid[] not null default '{}';
