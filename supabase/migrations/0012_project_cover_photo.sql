-- Omslagfoto per project — zichtbaar voor iedereen met projecttoegang
-- (geen aparte module-toggle, net als de rest van de projectkop).

alter table projects add column cover_photo_path text;

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
    else null
  end;
$$;
