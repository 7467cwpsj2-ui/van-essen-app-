-- De eigenaar wil zichzelf ook kunnen inplannen als eigen personeel
-- (bouwplanning, losse klussen, uren registreren, pushmeldingen) zonder
-- een tweede account te hoeven aanmaken en zonder dat dit zijn rechten
-- als eigenaar aantast. profiles.team_member_id kan niet gebruikt worden
-- (profile_role_link staat dat voor role='eigenaar' niet toe, met opzet
-- — dat zou de eigenaar/team/klant-scheiding vertroebelen). In plaats
-- daarvan koppelt deze kolom een gewone team_members-rij terug aan het
-- bestaande eigenaar-profiel, puur als "dit ben ik" markering.
alter table team_members add column owner_profile_id uuid references profiles(id) on delete set null;

-- Eén eigen-personeel-rij per eigenaar-account.
create unique index team_members_owner_profile_id_key on team_members(owner_profile_id) where owner_profile_id is not null;
