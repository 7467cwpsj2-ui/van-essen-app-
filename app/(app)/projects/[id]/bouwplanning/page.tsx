import { canEditSchedule, canSeeModule, requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { BouwplanningPanel } from "@/components/BouwplanningPanel";
import type { SchedulePhase, Task, TeamMember } from "@/types/database";

export default async function BouwplanningPage({ params }: { params: { id: string } }) {
  const current = await requireUser();
  if (!canSeeModule(current, "bouwplanning")) {
    return <div className="empty-hint">Je hebt geen toegang tot deze module.</div>;
  }

  const supabase = createClient();
  const [{ data: phases }, { data: tasks }, { data: teamMembers }] = await Promise.all([
    supabase.from("schedule_phases").select("*").eq("project_id", params.id).order("start_date"),
    supabase.from("tasks").select("*").eq("project_id", params.id),
    supabase.from("team_members").select("*").order("name"),
  ]);

  return (
    <BouwplanningPanel
      projectId={params.id}
      phases={(phases ?? []) as SchedulePhase[]}
      tasks={(tasks ?? []) as Task[]}
      teamMembers={((teamMembers ?? []) as TeamMember[]).map((m) => ({ id: m.id, name: m.name, trade: m.trade }))}
      canEdit={canEditSchedule(current)}
    />
  );
}
