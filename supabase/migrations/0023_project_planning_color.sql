-- Eigen kleur per project voor de algemene planning (owner-only overzicht
-- van wie waar wanneer loopt). Zonder gekozen kleur valt de UI terug op
-- een automatisch bepaalde kleur op basis van het project-id, dus dit
-- veld mag leeg blijven.
alter table projects add column if not exists planning_color text;
