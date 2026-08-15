-- Eigen personeel moet losse klussen waar zij zelf op ingepland staan
-- kunnen zien (voor hun "Mijn planning" op het dashboard) — voorheen
-- was quick_jobs volledig eigenaar-only.
create policy quick_jobs_select_team on quick_jobs for select
  using (current_profile_role() = 'team' and current_team_member_id() = any(assignee_team_member_ids));
