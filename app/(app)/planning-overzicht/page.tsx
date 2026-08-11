import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { TeamPlanningPanel, type PlanningRow } from "@/components/TeamPlanningPanel";

export default async function PlanningOverzichtPage() {
  const current = await requireUser();
  if (current.profile.role !== "eigenaar") notFound();

  const supabase = createClient();
  const { data } = await supabase
    .from("schedule_phases")
    .select("id,project_id,title,assignee,start_date,end_date,projects(name)")
    .order("start_date");

  const raw = (data ?? []) as unknown as {
    id: string;
    project_id: string;
    title: string;
    assignee: string | null;
    start_date: string;
    end_date: string;
    projects: { name: string } | null;
  }[];

  const rows: PlanningRow[] = raw.map((r) => ({
    id: r.id,
    title: r.title,
    projectId: r.project_id,
    projectName: r.projects?.name ?? "onbekend project",
    assignee: r.assignee?.trim() || null,
    start_date: r.start_date,
    end_date: r.end_date,
  }));

  rows.sort((a, b) => {
    if (!a.assignee && b.assignee) return 1;
    if (a.assignee && !b.assignee) return -1;
    if (a.assignee && b.assignee) {
      const cmp = a.assignee.localeCompare(b.assignee, "nl");
      if (cmp !== 0) return cmp;
    }
    return a.start_date.localeCompare(b.start_date);
  });

  return <TeamPlanningPanel rows={rows} />;
}
