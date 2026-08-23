-- Ongedaan maken van 0054_direct_messages.sql — de rechtstreekse-
-- berichten-functie is toch weer uit de app gehaald.
--
-- Let op: de team-messages bucket zelf verwijder je NIET via deze
-- migratie, maar handmatig in het dashboard: Storage → team-messages →
-- (···)-menu → Delete bucket. Supabase blokkeert een rechtstreekse
-- delete op storage.objects/storage.buckets via de SQL Editor
-- (foutmelding 42501, "Use the Storage API instead") — en dat blijkt ook
-- te gelden zodra het verwijderen van de bucket zelf geprobeerd wordt om
-- de bijbehorende bestanden mee te laten cascaderen. De dashboard-knop
-- gebruikt wél de Storage API en werkt daardoor gewoon.

drop policy if exists team_messages_files_select on storage.objects;
drop policy if exists team_messages_files_insert on storage.objects;
drop policy if exists team_messages_files_delete on storage.objects;

drop table if exists direct_messages;
