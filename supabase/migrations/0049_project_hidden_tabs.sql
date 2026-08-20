-- Niet elk project heeft alle modules nodig (bv. geen subsidie of geen
-- klantkeuzes bij een kleine klus) — de eigenaar kan nu per project
-- kiezen welke tabs uit de navigatiebalk verdwijnen, zodat die op
-- mobiel niet eindeloos hoeft te scrollen. Puur een weergavefilter: de
-- onderliggende pagina/rechten blijven ongewijzigd, dus een rechtstreekse
-- link naar een verborgen tab werkt nog gewoon.
alter table projects add column if not exists hidden_tabs text[] not null default '{}';
