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
  const memberTypeById = new Map((teamMembers ?? []).map((m) => [m.id as string, m.member_type as TeamMember["member_type"]]));
  const memberTypeByName = new Map(
    (teamMembers ?? []).map((m) => [(m.name as string).trim().toLowerCase(), m.member_type as TeamMember["member_type"]])
  );

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
      done: false,
    };
    if (r.assignee_team_member_ids.length > 0) {
      for (const memberId of r.assignee_team_member_ids) {
        rows.push({
          id: `${r.id}:${memberId}`,
          ...base,
          assignee: nameById.get(memberId) ?? "Onbekend personeelslid",
          memberType: memberTypeById.get(memberId) ?? "personeel",
        });
      }
    } else {
      const name = r.assignee?.trim() || null;
      rows.push({ id: r.id, ...base, assignee: name, memberType: name ? memberTypeByName.get(name.toLowerCase()) ?? "onderaannemer" : null });
    }
  }

  // Een afgeronde klus verdwijnt niet meteen van het overzicht — de
  // eigenaar wil kunnen terugkijken wat er deze (en vorige) week is
  // gebeurd. Ouder dan twee weken schuift 'm van de kalender af (blijft
  // wel gewoon terug te vinden in de lijst "Afgeronde losse klussen"
  // eronder), anders zou de kalender oneindig blijven doorgroeien.
  const doneCutoffIso = new Date(Date.now() - 14 * 86400000).toISOString().slice(0, 10);
  const jobs = (quickJobs ?? []) as QuickJob[];
  for (const j of jobs) {
    if (j.done && j.end_date < doneCutoffIso) continue;
    const base = {
      title: "Losse klus",
      projectId: `qj:${j.id}`,
      projectName: j.title,
      projectColor: j.color,
      isQuickJob: true,
      fixedDate: false,
      start_date: j.start_date,
      end_date: j.end_date,
      done: j.done,
    };
    if (j.day_assignments && j.day_assignments.length > 0) {
      // Bezetting kan per dag verschillen — per teamlid de aaneengesloten
      // reeks dagen tot één balk samenvoegen i.p.v. de kalender te
      // versnipperen in losse eendaagse balkjes.
      const daysByMember = new Map<string, string[]>();
      for (const d of j.day_assignments) {
        for (const memberId of d.team_member_ids) {
          if (!daysByMember.has(memberId)) daysByMember.set(memberId, []);
          daysByMember.get(memberId)!.push(d.date);
        }
      }
      for (const [memberId, dates] of daysByMember) {
        const sorted = [...dates].sort();
        let rangeStart = sorted[0];
        let prev = sorted[0];
        let idx = 0;
        const flush = (end: string) => {
          rows.push({
            id: `qj:${j.id}:${memberId}:${idx++}`,
            ...base,
            start_date: rangeStart,
            end_date: end,
            assignee: nameById.get(memberId) ?? "Onbekend personeelslid",
            memberType: memberTypeById.get(memberId) ?? "personeel",
          });
        };
        for (let i = 1; i < sorted.length; i++) {
          const gapDays = (new Date(sorted[i] + "T00:00:00Z").getTime() - new Date(prev + "T00:00:00Z").getTime()) / 86400000;
          if (gapDays > 3) {
            flush(prev);
            rangeStart = sorted[i];
          }
          prev = sorted[i];
        }
        flush(prev);
      }
    } else if (j.assignee_team_member_ids.length > 0) {
      for (const memberId of j.assignee_team_member_ids) {
        rows.push({
          id: `qj:${j.id}:${memberId}`,
          ...base,
          assignee: nameById.get(memberId) ?? "Onbekend personeelslid",
          memberType: memberTypeById.get(memberId) ?? "personeel",
        });
      }
    } else {
      const name = j.assignee?.trim() || null;
      rows.push({ id: `qj:${j.id}`, ...base, assignee: name, memberType: name ? memberTypeByName.get(name.toLowerCase()) ?? "onderaannemer" : null });
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
