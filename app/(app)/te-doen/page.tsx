import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { canSeeModule, requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { PlanningPanel } from "@/components/PlanningPanel";
import type { Task, TeamMember } from "@/types/database";

export default async function AlleTeDoenPage() {
  const current = await requireUser();
  if (!canSeeModule(current, "planning")) {
    return <div className="empty-hint">Je hebt geen toegang tot deze module.</div>;
  }

  const supabase = createClient();
  const [{ data: projects }, { data: teamMembers }] = await Promise.all([
    supabase.from("projects").select("id,name,delivery_signed_at").order("name"),
    supabase.from("team_members").select("*").order("name"),
  ]);

  const teamMemberOptions = ((teamMembers ?? []) as TeamMember[]).map((m) => ({ id: m.id, name: m.name, member_type: m.member_type }));

  const sections = await Promise.all(
    (projects ?? []).map(async (p) => {
      const { data: tasks } = await supabase
        .from("tasks")
        .select("*")
        .eq("project_id", p.id)
        .eq("done", false)
        .order("due_date", { ascending: true, nullsFirst: false });
      return { project: p, tasks: (tasks ?? []) as Task[] };
    })
  );

  const withOpenItems = sections.filter((s) => s.tasks.length > 0);

  return (
    <div className="dashboard">
      <div className="header-eyebrow">Overzicht</div>
      <h1 className="page-title">
        Alle openstaande te doen
      </h1>
      {withOpenItems.length === 0 ? (
        <div className="empty-hint">Nergens meer iets te doen.</div>
      ) : (
        withOpenItems.map(({ project, tasks }) => (
          <div key={project.id} className="overview-group">
            <Link href={`/projects/${project.id}/planning`} className="overview-group-head">
              {project.name} <ArrowRight size={13} />
            </Link>
            <PlanningPanel
              projectId={project.id}
              role={current.profile.role}
              currentTeamMemberId={current.profile.team_member_id}
              isLocked={!!project.delivery_signed_at}
              tasks={tasks}
              teamMembers={teamMemberOptions}
              hideAddForm
            />
          </div>
        ))
      )}
    </div>
  );
}
