import { canSeeModule, requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { PlanningPanel } from "@/components/PlanningPanel";
import type { Project, Task, TeamMember } from "@/types/database";

export default async function PlanningPage({ params }: { params: { id: string } }) {
  const current = await requireUser();
  if (!canSeeModule(current, "planning")) {
    return <div className="empty-hint">Je hebt geen toegang tot deze module.</div>;
  }

  const supabase = createClient();
  const [{ data: tasks }, { data: teamMembers }, { data: project }] = await Promise.all([
    supabase.from("tasks").select("*").eq("project_id", params.id).order("created_at"),
    supabase.from("team_members").select("*").order("name"),
    supabase.from("projects").select("delivery_signed_at").eq("id", params.id).single(),
  ]);

  return (
    <PlanningPanel
      projectId={params.id}
      role={current.profile.role}
      currentTeamMemberId={current.profile.team_member_id}
      isLocked={!!(project as Pick<Project, "delivery_signed_at"> | null)?.delivery_signed_at}
      tasks={(tasks ?? []) as Task[]}
      teamMembers={((teamMembers ?? []) as TeamMember[]).map((m) => ({ id: m.id, name: m.name }))}
    />
  );
}
