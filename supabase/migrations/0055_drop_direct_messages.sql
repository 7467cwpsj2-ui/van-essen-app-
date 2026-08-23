-- Ongedaan maken van 0054_direct_messages.sql — de rechtstreekse-
-- berichten-functie is toch weer uit de app gehaald.

drop policy if exists team_messages_files_select on storage.objects;
drop policy if exists team_messages_files_insert on storage.objects;
drop policy if exists team_messages_files_delete on storage.objects;

delete from storage.objects where bucket_id = 'team-messages';
delete from storage.buckets where id = 'team-messages';

drop table if exists direct_messages;
