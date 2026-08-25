-- Postgres indexeert een foreign key niet automatisch — alleen de
-- primary key en unique-constraints krijgen dat gratis. Vrijwel elke
-- query in de app filtert op project_id/quick_job_id/team_member_id/
-- client_id, maar op drie kleine tabellen na (subsidy_check_items,
-- subsidy_check_item_photos, notifications) stond daar nergens een
-- index op. Bij de huidige, nog bescheiden hoeveelheid data merk je dat
-- nauwelijks, maar dit is precies het soort ding dat pas knelt zodra er
-- jaren aan foto's/chat/uren bij zijn gekomen — en kost nu niets om
-- vast toe te voegen (puur additief, geen gedragswijziging).
create index if not exists project_team_access_project_id_idx on project_team_access(project_id);
create index if not exists project_team_access_team_member_id_idx on project_team_access(team_member_id);
create index if not exists schedule_phases_project_id_idx on schedule_phases(project_id);
create index if not exists tasks_project_id_idx on tasks(project_id);
create index if not exists drawings_project_id_idx on drawings(project_id);
create index if not exists photos_project_id_idx on photos(project_id);
create index if not exists extra_work_project_id_idx on extra_work(project_id);
create index if not exists notes_project_id_idx on notes(project_id);
create index if not exists completion_points_project_id_idx on completion_points(project_id);
create index if not exists client_choices_project_id_idx on client_choices(project_id);
create index if not exists warranty_items_project_id_idx on warranty_items(project_id);
create index if not exists chat_messages_project_id_idx on chat_messages(project_id);
create index if not exists owner_client_messages_project_id_idx on owner_client_messages(project_id);
create index if not exists hours_project_id_idx on hours(project_id);
create index if not exists hours_quick_job_id_idx on hours(quick_job_id);
create index if not exists hours_team_member_id_idx on hours(team_member_id);
create index if not exists cost_items_project_id_idx on cost_items(project_id);
create index if not exists cost_items_quick_job_id_idx on cost_items(quick_job_id);
create index if not exists project_client_access_project_id_idx on project_client_access(project_id);
create index if not exists project_client_access_client_id_idx on project_client_access(client_id);
create index if not exists profiles_team_member_id_idx on profiles(team_member_id);
create index if not exists profiles_client_id_idx on profiles(client_id);
create index if not exists push_subscriptions_user_id_idx on push_subscriptions(user_id);
