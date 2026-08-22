-- Bijhouden welk meer-/minderwerk al aan de klant is gefactureerd —
-- puur een vinkje voor de eigenaar, los van de goedkeuringsstatus.
alter table extra_work add column if not exists invoiced boolean not null default false;
