-- Foto's/bestanden versturen in de privéchat tussen eigenaar en klant.
-- Privéchat heeft geen module-toggle (harde regel, team komt hier nooit
-- bij) — daarom NIET via de generieke storage_module_key/has_module_access
-- route laten lopen (die valt voor een onbekende map terug op "toegestaan"
-- via coalese(..., true), wat hier een lek zou zijn), maar een eigen
-- storage-policy die exact dezelfde regel volgt als owner_client_messages
-- zelf: alleen eigenaar of klant, nooit team.

alter table owner_client_messages add column file_path text;
alter table owner_client_messages add column file_type text check (file_type in ('image', 'pdf'));

drop policy if exists project_files_select on storage.objects;
create policy project_files_select on storage.objects for select
  using (
    bucket_id = 'project-files'
    and (storage.foldername(name))[2] <> 'privechat'
    and has_project_access((storage.foldername(name))[1]::uuid)
    and has_module_access((storage.foldername(name))[1]::uuid, storage_module_key((storage.foldername(name))[2]))
  );

drop policy if exists project_files_insert on storage.objects;
create policy project_files_insert on storage.objects for insert
  with check (
    bucket_id = 'project-files'
    and (storage.foldername(name))[2] <> 'privechat'
    and has_project_access((storage.foldername(name))[1]::uuid)
    and has_module_access((storage.foldername(name))[1]::uuid, storage_module_key((storage.foldername(name))[2]))
  );

create policy privechat_files_select on storage.objects for select
  using (
    bucket_id = 'project-files'
    and (storage.foldername(name))[2] = 'privechat'
    and (
      is_owner()
      or (current_profile_role() = 'klant' and has_project_access((storage.foldername(name))[1]::uuid))
    )
  );

create policy privechat_files_insert on storage.objects for insert
  with check (
    bucket_id = 'project-files'
    and (storage.foldername(name))[2] = 'privechat'
    and (
      is_owner()
      or (current_profile_role() = 'klant' and has_project_access((storage.foldername(name))[1]::uuid))
    )
  );
