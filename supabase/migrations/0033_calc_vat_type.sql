-- Duidelijkheid of het offertebedrag en losse kostenposten in de
-- nacalculatie excl. of incl. btw zijn — zelfde principe (alleen een
-- label, geen automatische btw-berekening) als bij meer-/minderwerk.
alter table projects add column if not exists quote_vat_type text not null default 'excl'
  check (quote_vat_type in ('excl', 'incl'));

alter table cost_items add column if not exists vat_type text not null default 'excl'
  check (vat_type in ('excl', 'incl'));
