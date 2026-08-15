import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { TeamPlanningPanel, type PlanningRow } from "@/components/TeamPlanningPanel";
import type { QuickJob, TeamMember } from "@/types/database";

export default async function PlanningOverzichtPage() {
  const current = await requireUser();
  if (current.profile.role !== "eigenaar") notFound();

  const supabase = createClient();
  const [{ data }, { data: teamMembers }, { data: quickJobs }] = await Promise.all([
    supabase
      .from("schedule_phases")
      .select("id,project_id,title,assignee,assignee_team_member_ids,start_date,end_date,fixed_date,projects(name,planning_color)")
      .order("start_date"),
    supabase.from("team_members").select("id,name,trade,member_type"),
    supabase.from("quick_jobs").select("*").order("start_date"),
  ]);

  const nameById = new Map((teamMembers ?? []).map((m) => [m.id as string, m.name as string]));

  const raw = (data ?? []) as unknown as {
    id: string;
    project_id: string;
    title: string;
    assignee: string | null;
    assignee_team_member_ids: string[];
    start_date: string;
    end_date: string;
    fixed_date: boolean;
    projects: { name: string; planning_color: string | null } | null;
  }[];

  const rows: PlanningRow[] = [];
  for (const r of raw) {
    const base = {
      title: r.title,
      projectId: r.project_id,
      projectName: r.projects?.name ?? "onbekend project",
      projectColor: r.projects?.planning_color ?? null,
      isQuickJob: false,
      fixedDate: r.fixed_date,
      start_date: r.start_date,
      end_date: r.end_date,
    };
    if (r.assignee_team_member_ids.length > 0) {
      for (const memberId of r.assignee_team_member_ids) {
        rows.push({ id: `${r.id}:${memberId}`, ...base, assignee: nameById.get(memberId) ?? "Onbekend personeelslid" });
      }
    } else {
      rows.push({ id: r.id, ...base, assignee: r.assignee?.trim() || null });
    }
  }

  const jobs = (quickJobs ?? []) as QuickJob[];
  for (const j of jobs) {
    const base = {
      title: "Losse klus",
      projectId: `qj:${j.id}`,
      projectName: j.title,
      projectColor: null,
      isQuickJob: true,
      fixedDate: false,
      start_date: j.start_date,
      end_date: j.end_date,
    };
    if (j.assignee_team_member_ids.length > 0) {
      for (const memberId of j.assignee_team_member_ids) {
        rows.push({ id: `qj:${j.id}:${memberId}`, ...base, assignee: nameById.get(memberId) ?? "Onbekend personeelslid" });
      }
    } else {
      rows.push({ id: `qj:${j.id}`, ...base, assignee: j.assignee?.trim() || null });
    }
  }

  rows.sort((a, b) => {
    if (!a.assignee && b.assignee) return 1;
    if (a.assignee && !b.assignee) return -1;
    if (a.assignee && b.assignee) {
      const cmp = a.assignee.localeCompare(b.assignee, "nl");
      if (cmp !== 0) return cmp;
    }
    return a.start_date.localeCompare(b.start_date);
  });

  return (
    <TeamPlanningPanel
      rows={rows}
      quickJobs={jobs}
      teamMembers={((teamMembers ?? []) as Pick<TeamMember, "id" | "name" | "trade" | "member_type">[]).map((m) => ({
        id: m.id,
        name: m.name,
        trade: m.trade,
        member_type: m.member_type,
      }))}
    />
  );
}
