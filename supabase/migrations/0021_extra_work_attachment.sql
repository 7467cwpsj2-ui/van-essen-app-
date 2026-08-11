-- Bij meer-/minderwerk kan nu ook een foto of bestand toegevoegd worden
-- ter onderbouwing van de uitgebreide beschrijving.

alter table extra_work add column photo_path text;
alter table extra_work add column file_type text check (file_type in ('image', 'pdf'));

create or replace function storage_module_key(p_folder text)
returns text
language sql immutable
as $$
  select case p_folder
    when 'drawings' then 'tekeningen'
    when 'photos' then 'fotos'
    when 'signatures' then 'meerwerk'
    when 'delivery' then 'dossier'
    when 'completion-points' then 'opleverpunten'
    when 'cover' then 'cover'
    when 'extra-work' then 'meerwerk'
    else null
  end;
$$;
