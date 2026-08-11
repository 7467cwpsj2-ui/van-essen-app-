import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { TeamPlanningPanel, type PlanningGroup, type PlanningRow } from "@/components/TeamPlanningPanel";

export default async function PlanningOverzichtPage() {
  const current = await requireUser();
  if (current.profile.role !== "eigenaar") notFound();

  const supabase = createClient();
  const { data } = await supabase
    .from("schedule_phases")
    .select("id,project_id,title,assignee,start_date,end_date,projects(name)")
    .order("start_date");

  const rows = (data ?? []) as unknown as {
    id: string;
    project_id: string;
    title: string;
    assignee: string | null;
    start_date: string;
    end_date: string;
    projects: { name: string } | null;
  }[];

  const groupMap = new Map<string, PlanningGroup>();
  const unassigned: PlanningRow[] = [];

  for (const r of rows) {
    const row: PlanningRow = {
      id: r.id,
      title: r.title,
      projectId: r.project_id,
      projectName: r.projects?.name ?? "onbekend project",
      start_date: r.start_date,
      end_date: r.end_date,
    };
    const name = r.assignee?.trim();
    if (!name) {
      unassigned.push(row);
      continue;
    }
    const key = name.toLowerCase();
    if (!groupMap.has(key)) groupMap.set(key, { assignee: name, rows: [] });
    groupMap.get(key)!.rows.push(row);
  }

  const groups = Array.from(groupMap.values()).sort((a, b) => a.assignee.localeCompare(b.assignee, "nl"));
  if (unassigned.length > 0) groups.push({ assignee: "Nog niet toegewezen", rows: unassigned });

  return <TeamPlanningPanel groups={groups} />;
}
