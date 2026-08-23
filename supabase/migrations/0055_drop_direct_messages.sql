-- Ongedaan maken van 0054_direct_messages.sql — de rechtstreekse-
-- berichten-functie is toch weer uit de app gehaald.
--
-- Let op: Supabase staat een rechtstreekse `delete from storage.objects`
-- via de SQL Editor niet toe (foutmelding 42501, "Use the Storage API
-- instead") — dat moet via Storage → team-messages in het dashboard,
-- vóórdat deze migratie draait, maar alleen als die map niet al leeg is.

drop policy if exists team_messages_files_select on storage.objects;
drop policy if exists team_messages_files_insert on storage.objects;
drop policy if exists team_messages_files_delete on storage.objects;

delete from storage.buckets where id = 'team-messages';

drop table if exists direct_messages;
