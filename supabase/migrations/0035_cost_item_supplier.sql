-- Leverancier en factuurnummer bij een kostenpost, zodat kosten ook
-- per leverancier opgeteld kunnen worden in de nacalculatie.
alter table cost_items add column if not exists supplier text;
alter table cost_items add column if not exists invoice_number text;
