-- Kleur van een losse klus in de algemene planning was tot nu toe
-- alleen automatisch bepaald (colorForProject) en niet aan te passen —
-- net als bij projecten (projects.planning_color) wil de eigenaar dit
-- ook per losse klus zelf kunnen kiezen.
alter table quick_jobs add column color text null;
