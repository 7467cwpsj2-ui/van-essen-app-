-- Foto bij een opleverpunt — verduidelijkt wat er precies moet gebeuren.
-- Alleen de eigenaar maakt opleverpunten aan (zie completion_points_insert
-- in 0002_fase2.sql), dus geen aparte RLS-wijziging op de tabel nodig.

alter table completion_points add column photo_path text;

-- ============================================================
-- Storage: foto's bij een opleverpunt hergebruiken dezelfde bucket,
-- in een aparte map die aan de 'opleverpunten'-module hangt.
-- ============================================================

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
    else null
  end;
$$;
