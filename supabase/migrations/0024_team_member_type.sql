-- Onderscheid tussen eigen personeel (Van Essen Bouw & Onderhoud) en
-- extern team/onderaannemers. Bestaande teamleden vallen standaard onder
-- 'onderaannemer' — de eigenaar zet zijn eigen personeel handmatig om.
alter table team_members add column if not exists member_type text not null default 'onderaannemer'
  check (member_type in ('personeel', 'onderaannemer'));
