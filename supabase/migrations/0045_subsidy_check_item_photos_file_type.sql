-- De bewijsbijlagen per subsidiemaatregel waren beperkt tot foto's; nu
-- kunnen daar ook bestanden (bv. facturen, betaalbewijzen als PDF) bij,
-- en kunnen er in één keer meerdere tegelijk worden toegevoegd. Deze
-- kolom onthoudt of een bijlage een foto of een document is, zodat het
-- scherm en het subsidiedocument ze correct kunnen weergeven.
alter table subsidy_check_item_photos add column if not exists file_type text not null default 'image';
