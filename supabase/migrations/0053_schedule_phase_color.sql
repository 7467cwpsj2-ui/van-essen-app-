-- Eigen kleur per bouwplanning-fase, los van het automatisch afgeleide
-- kleurtje op basis van de uitvoerder/aannemer — zonder ingestelde
-- kleur blijft de bestaande automatische herleiding gewoon gelden.
alter table schedule_phases add column color text null;
