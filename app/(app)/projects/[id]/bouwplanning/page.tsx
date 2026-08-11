import { canEditSchedule, canSeeModule, requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { BouwplanningPanel, type PhaseConflict } from "@/components/BouwplanningPanel";
import type { SchedulePhase, Task, TeamMember } from "@/types/database";

function overlaps(aStart: string, aEnd: string, bStart: string, bEnd: string) {
  return aStart <= bEnd && bStart <= aEnd;
}

function identities(assignee: string | null, teamMemberIds: string[]): string[] {
  if (teamMemberIds.length > 0) return teamMemberIds.map((id) => `id:${id}`);
  const name = assignee?.trim();
  return name ? [`name:${name.toLowerCase()}`] : [];
}

export default async function BouwplanningPage({ params }: { params: { id: string } }) {
  const current = await requireUser();
  if (!canSeeModule(current, "bouwplanning")) {
    return <div className="empty-hint">Je hebt geen toegang tot deze module.</div>;
  }

  const supabase = createClient();
  const [{ data: phases }, { data: tasks }, { data: teamMembers }, { data: otherPhases }] = await Promise.all([
    supabase.from("schedule_phases").select("*").eq("project_id", params.id).order("start_date"),
    supabase.from("tasks").select("*").eq("project_id", params.id),
    supabase.from("team_members").select("*").order("name"),
    supabase
      .from("schedule_phases")
      .select("id,project_id,title,assignee,assignee_team_member_ids,start_date,end_date,projects(name)")
      .neq("project_id", params.id)
      .or("assignee.not.is.null,assignee_team_member_ids.neq.{}"),
  ]);

  const rows = (phases ?? []) as SchedulePhase[];
  const others = (otherPhases ?? []) as unknown as {
    id: string;
    title: string;
    assignee: string | null;
    assignee_team_member_ids: string[];
    start_date: string;
    end_date: string;
    projects: { name: string } | null;
  }[];

  const conflicts: Record<string, PhaseConflict[]> = {};
  for (const phase of rows) {
    const mine = identities(phase.assignee, phase.assignee_team_member_ids);
    if (mine.length === 0) continue;
    const matches = others.filter(
      (o) =>
        overlaps(phase.start_date, phase.end_date, o.start_date, o.end_date) &&
        identities(o.assignee, o.assignee_team_member_ids).some((id) => mine.includes(id))
    );
    if (matches.length) {
      conflicts[phase.id] = matches.map((m) => ({ projectName: m.projects?.name ?? "een ander project", title: m.title }));
    }
  }

  return (
    <BouwplanningPanel
      projectId={params.id}
      phases={rows}
      tasks={(tasks ?? []) as Task[]}
      teamMembers={((teamMembers ?? []) as TeamMember[]).map((m) => ({ id: m.id, name: m.name, trade: m.trade, member_type: m.member_type }))}
      canEdit={canEditSchedule(current)}
      conflicts={conflicts}
    />
  );
}
