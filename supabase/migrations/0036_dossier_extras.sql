-- Opleverdossier "next level": een deelbare, leesalleen link zonder
-- login. De token is een losse, niet-raadbare waarde (niet het project-id
-- zelf) zodat een gelekte link nooit meer blootlegt dan dit ene dossier.
alter table projects add column if not exists dossier_share_token uuid unique;
