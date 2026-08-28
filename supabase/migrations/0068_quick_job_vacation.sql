-- Vakantie plannen voor eigen personeel — zelfde soort ding als een
-- kantoordag (migratie 0064), alleen dan voor willekeurig welk
-- teamlid i.p.v. alleen de eigenaar: geen klant/project, geen
-- route/adres, geen ochtend-pushmelding, niet in de nacalculatie.
alter table quick_jobs drop constraint if exists quick_jobs_kind_check;
alter table quick_jobs add constraint quick_jobs_kind_check check (kind in ('klus', 'kantoor', 'verlof'));
