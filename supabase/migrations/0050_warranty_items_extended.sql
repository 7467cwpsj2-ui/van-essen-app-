-- Uitbreiding van garantie-items in het opleverdossier: onderscheid
-- tussen Van Essens eigen (werk)garantie en fabrieksgarantie van de
-- fabrikant (bv. bij een warmtepomp, cv-ketel of sanitair — die lopen
-- vaak via de leverancier en hebben een eigen ingangsdatum), plus een
-- optioneel bijgevoegd garantiecertificaat/document.
alter table warranty_items add column if not exists warranty_type text not null default 'eigen' check (warranty_type in ('eigen', 'fabrikant'));
alter table warranty_items add column if not exists manufacturer text;
alter table warranty_items add column if not exists start_date date;
alter table warranty_items add column if not exists certificate_path text;
alter table warranty_items add column if not exists certificate_file_type text check (certificate_file_type in ('image', 'pdf'));
