-- Teamlid/klant verwijderen kon vastlopen met een generieke serverfout
-- zodra die persoon ooit iets had aangemaakt/geüpload: de kolommen die
-- naar auth.users(id) verwijzen (created_by, uploader_id, author_id)
-- hadden geen ON DELETE-regel, dus Postgres weigerde de gekoppelde
-- auth-account te verwijderen (foreign key violation). Omdat dat account
-- daardoor bleef bestaan, liep de daaropvolgende verwijdering van de
-- team_members/clients-rij alsnog vast op de profile_role_link-check.
-- Nu blijft het aangemaakte/geüploade item gewoon bestaan (met de al
-- bewaarde naam-snapshot, bijv. uploaded_by/author_name), alleen de
-- koppeling naar de verwijderde gebruiker wordt leeg.

alter table projects drop constraint projects_created_by_fkey;
alter table projects add constraint projects_created_by_fkey
  foreign key (created_by) references auth.users(id) on delete set null;

alter table drawings drop constraint drawings_uploader_id_fkey;
alter table drawings add constraint drawings_uploader_id_fkey
  foreign key (uploader_id) references auth.users(id) on delete set null;

alter table photos drop constraint photos_uploader_id_fkey;
alter table photos add constraint photos_uploader_id_fkey
  foreign key (uploader_id) references auth.users(id) on delete set null;

alter table extra_work drop constraint extra_work_created_by_fkey;
alter table extra_work add constraint extra_work_created_by_fkey
  foreign key (created_by) references auth.users(id) on delete set null;

alter table notes drop constraint notes_author_id_fkey;
alter table notes add constraint notes_author_id_fkey
  foreign key (author_id) references auth.users(id) on delete set null;

alter table chat_messages drop constraint chat_messages_author_id_fkey;
alter table chat_messages add constraint chat_messages_author_id_fkey
  foreign key (author_id) references auth.users(id) on delete set null;

alter table owner_client_messages drop constraint owner_client_messages_author_id_fkey;
alter table owner_client_messages add constraint owner_client_messages_author_id_fkey
  foreign key (author_id) references auth.users(id) on delete set null;
