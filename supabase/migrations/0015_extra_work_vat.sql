-- Bij meer-/minderwerk kan de eigenaar aangeven of het bedrag excl. of
-- incl. btw is, zodat dat voor de klant duidelijk zichtbaar is bij het
-- bedrag zelf (i.p.v. impliciet/onduidelijk).

alter table extra_work add column vat_type text not null default 'excl' check (vat_type in ('excl', 'incl'));
