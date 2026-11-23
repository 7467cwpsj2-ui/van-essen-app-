-- Projectnummer: kort, puur numeriek nummer voor communicatie met
-- klanten/leveranciers en voor latere automatische e-mailherkenning.
-- Deze kolom bevat alléén het reeksnummer (100, 101, 102, ...) — bij het
-- tonen plakt de app (zie lib/projectNumber.ts) er zelf een Luhn-
-- controlecijfer achteraan, zodat een enkel verkeerd getikt/doorgebeld
-- cijfer bijna altijd opvalt in plaats van stilletjes op een ánder,
-- toevallig bestaand nummer uit te komen. Eén sequence, gedeeld tussen
-- projecten en losse klussen (nooit dubbel uitgegeven — een leverancier
-- kan aan allebei werken).
create sequence project_number_seq start with 100 increment by 1;

alter table projects add column project_number integer unique;
alter table projects alter column project_number set default nextval('project_number_seq');

alter table quick_jobs add column project_number integer unique;
alter table quick_jobs alter column project_number set default nextval('project_number_seq');

-- Externe offerte-/factuurnummers uit de eigen facturatietool van Van
-- Essen, zodat die ook in de app bij het project/de klus te vinden zijn
-- in plaats van alleen in een los PDF-bestand.
alter table projects add column offer_number text;
alter table projects add column invoice_numbers text[] not null default '{}';
alter table quick_jobs add column offer_number text;
alter table quick_jobs add column invoice_numbers text[] not null default '{}';

-- Bestaande rijen nummeren op volgorde van aanmaakdatum, zodat oudere
-- projecten/klussen ook de laagste nummers krijgen.
do $$
declare
  rec record;
begin
  for rec in select id from projects order by created_at loop
    update projects set project_number = nextval('project_number_seq') where id = rec.id;
  end loop;
  for rec in select id from quick_jobs order by created_at loop
    update quick_jobs set project_number = nextval('project_number_seq') where id = rec.id;
  end loop;
end $$;
