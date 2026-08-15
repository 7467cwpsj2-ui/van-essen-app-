-- Uurtarief kan excl. of incl. btw ingevuld zijn — in tegenstelling tot
-- de andere btw-labels in de app rekent de nacalculatie dit automatisch
-- om naar excl. btw (het gangbare uitgangspunt voor werkelijke kosten),
-- met het standaard hoge btw-tarief van 21%.
alter table team_members add column if not exists hourly_rate_vat_type text not null default 'excl'
  check (hourly_rate_vat_type in ('excl', 'incl'));
