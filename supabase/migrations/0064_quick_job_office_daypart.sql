-- "Kantoordag": de eigenaar (of personeel) zit soms een hele of halve
-- dag op kantoor i.p.v. op een klus/project — dat wil hij ook in de
-- algemene planning kunnen inplannen, duidelijk te onderscheiden van
-- echt werk op locatie (geen adres/route, geen ochtend-pushmelding).
-- Hergebruikt bewust de bestaande quick_jobs-tabel (zelfde kalender-,
-- kleur- en dag-bewerklogica) i.p.v. een aparte tabel.
alter table quick_jobs add column kind text not null default 'klus' check (kind in ('klus', 'kantoor'));

-- Voor zowel klussen als kantoordagen: sommige klussen zijn maar een
-- halve dag werk. Geldt voor de hele periode als er geen dag-voor-dag
-- verdeling is; bij day_assignments (jsonb, geen migratie nodig) kan
-- elke dag z'n eigen "daypart" meekrijgen.
alter table quick_jobs add column daypart text not null default 'dag' check (daypart in ('ochtend', 'middag', 'dag'));
