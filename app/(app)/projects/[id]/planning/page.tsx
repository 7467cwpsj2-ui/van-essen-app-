import { canSeeModule, requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { PlanningPanel } from "@/components/PlanningPanel";
import type { SchedulePhase, Task, TeamMember } from "@/types/database";

export default async function PlanningPage({ params }: { params: { id: string } }) {
  const current = await requireUser();
  if (!canSeeModule(current, "planning")) {
    return <div className="empty-hint">Je hebt geen toegang tot deze module.</div>;
  }

  const supabase = createClient();
  const [{ data: phases }, { data: tasks }, { data: teamMembers }] = await Promise.all([
    supabase.from("schedule_phases").select("*").eq("project_id", params.id).order("start_date"),
    supabase.from("tasks").select("*").eq("project_id", params.id).order("created_at"),
    supabase.from("team_members").select("*").order("name"),
  ]);

  return (
    <PlanningPanel
      projectId={params.id}
      role={current.profile.role}
      phases={(phases ?? []) as SchedulePhase[]}
      tasks={(tasks ?? []) as Task[]}
      teamMembers={((teamMembers ?? []) as TeamMember[]).map((m) => ({ id: m.id, name: m.name, trade: m.trade }))}
    />
  );
}
