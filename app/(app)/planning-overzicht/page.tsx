import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { TeamPlanningPanel, type PlanningRow } from "@/components/TeamPlanningPanel";
import type { DayPart, PlanningChangeRequest, QuickJob, TeamMember } from "@/types/database";

// Een klus/fase met minstens één onderaannemer erbij wordt voor een
// beperkte viewer (uitvoerder) helemaal niet getoond — RLS kan geen
// losse array-elementen uit een rij filteren (zie migratie 0069), dus
// bij gemengde bezetting valt de hele rij weg i.p.v. dat de
// onderaannemer alsnog half zichtbaar blijft.
function quickJobIsOwnStaffOnly(
  j: QuickJob,
  memberTypeById: Map<string, TeamMember["member_type"]>,
  memberTypeByName: Map<string, TeamMember["member_type"]>
): boolean {
  const ids =
    j.day_assignments && j.day_assignments.length > 0
      ? Array.from(new Set(j.day_assignments.flatMap((d) => d.team_member_ids)))
      : j.assignee_team_member_ids;
  if (ids.length > 0) {
    return ids.every((id) => (memberTypeById.get(id) ?? "personeel") === "personeel");
  }
  const name = j.assignee?.trim().toLowerCase();
  if (!name) return true;
  return (memberTypeByName.get(name) ?? "onderaannemer") === "personeel";
}

export default async function PlanningOverzichtPage() {
  const current = await requireUser();
  const teamAccess = current.profile.role === "team" ? current.teamMember?.planning_overzicht_access ?? "geen" : "geen";
  if (current.profile.role !== "eigenaar" && teamAccess === "geen") notFound();
  const accessLevel: "eigenaar" | "bekijken" | "wijzigen" =
    current.profile.role === "eigenaar" ? "eigenaar" : (teamAccess as "bekijken" | "wijzigen");
  // Uitvoerders zien voor nu bewust alleen eigen personeel, geen
  // onderaannemers — zie het gesprek dat tot deze functie leidde.
  const restrictToOwnStaff = accessLevel !== "eigenaar";

  const supabase = createClient();
  const [{ data }, { data: teamMembers }, { data: quickJobs }, { data: changeRequests }] = await Promise.all([
    supabase
      .from("schedule_phases")
      .select("id,project_id,title,assignee,assignee_team_member_ids,start_date,end_date,fixed_date,projects(name,planning_color)")
      .order("start_date"),
    supabase.from("team_members").select("id,name,trade,member_type"),
    supabase.from("quick_jobs").select("*").order("start_date"),
    accessLevel === "eigenaar"
      ? supabase.from("planning_change_requests").select("*").eq("status", "pending").order("created_at")
      : accessLevel === "wijzigen"
        ? supabase
            .from("planning_change_requests")
            .select("*")
            .eq("requested_by", current.id)
            .order("created_at", { ascending: false })
            .limit(20)
        : Promise.resolve({ data: [] as PlanningChangeRequest[] }),
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
      kind: "klus" as const,
      daypart: "dag" as DayPart,
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
  const allJobs = (quickJobs ?? []) as QuickJob[];
  const jobs = restrictToOwnStaff
    ? allJobs.filter((j) => quickJobIsOwnStaffOnly(j, memberTypeById, memberTypeByName))
    : allJobs;
  for (const j of jobs) {
    if (j.done && j.end_date < doneCutoffIso) continue;
    const base = {
      title: j.kind === "kantoor" ? "Kantoordag" : j.kind === "verlof" ? "Vakantie" : "Losse klus",
      projectId: `qj:${j.id}`,
      projectName: j.title,
      projectColor: j.color,
      isQuickJob: true,
      fixedDate: false,
      start_date: j.start_date,
      end_date: j.end_date,
      done: j.done,
      kind: j.kind,
    };
    if (j.day_assignments && j.day_assignments.length > 0) {
      // Bezetting (én dagdeel) kan per dag verschillen — per teamlid de
      // aaneengesloten reeks dagen mét hetzelfde dagdeel tot één balk
      // samenvoegen i.p.v. de kalender te versnipperen in losse
      // eendaagse balkjes.
      const daysByMember = new Map<string, { date: string; daypart: DayPart }[]>();
      for (const d of j.day_assignments) {
        for (const memberId of d.team_member_ids) {
          if (!daysByMember.has(memberId)) daysByMember.set(memberId, []);
          daysByMember.get(memberId)!.push({ date: d.date, daypart: d.daypart ?? "dag" });
        }
      }
      for (const [memberId, entries] of daysByMember) {
        const sorted = [...entries].sort((a, b) => a.date.localeCompare(b.date));
        let rangeStart = sorted[0].date;
        let rangeDaypart = sorted[0].daypart;
        let prev = sorted[0];
        let idx = 0;
        const flush = (end: string, daypart: DayPart) => {
          rows.push({
            id: `qj:${j.id}:${memberId}:${idx++}`,
            ...base,
            start_date: rangeStart,
            end_date: end,
            daypart,
            assignee: nameById.get(memberId) ?? "Onbekend personeelslid",
            memberType: memberTypeById.get(memberId) ?? "personeel",
          });
        };
        for (let i = 1; i < sorted.length; i++) {
          const gapDays = (new Date(sorted[i].date + "T00:00:00Z").getTime() - new Date(prev.date + "T00:00:00Z").getTime()) / 86400000;
          if (gapDays > 3 || sorted[i].daypart !== rangeDaypart) {
            flush(prev.date, rangeDaypart);
            rangeStart = sorted[i].date;
            rangeDaypart = sorted[i].daypart;
          }
          prev = sorted[i];
        }
        flush(prev.date, rangeDaypart);
      }
    } else if (j.assignee_team_member_ids.length > 0) {
      for (const memberId of j.assignee_team_member_ids) {
        rows.push({
          id: `qj:${j.id}:${memberId}`,
          ...base,
          daypart: j.daypart,
          assignee: nameById.get(memberId) ?? "Onbekend personeelslid",
          memberType: memberTypeById.get(memberId) ?? "personeel",
        });
      }
    } else {
      const name = j.assignee?.trim() || null;
      rows.push({
        id: `qj:${j.id}`,
        ...base,
        daypart: j.daypart,
        assignee: name,
        memberType: name ? memberTypeByName.get(name.toLowerCase()) ?? "onderaannemer" : null,
      });
    }
  }

  const visibleRows = restrictToOwnStaff ? rows.filter((r) => r.memberType !== "onderaannemer") : rows;
  visibleRows.sort((a, b) => {
    if (!a.assignee && b.assignee) return 1;
    if (a.assignee && !b.assignee) return -1;
    if (a.assignee && b.assignee) {
      const cmp = a.assignee.localeCompare(b.assignee, "nl");
      if (cmp !== 0) return cmp;
    }
    return a.start_date.localeCompare(b.start_date);
  });

  const teamMembersForPanel = ((teamMembers ?? []) as Pick<TeamMember, "id" | "name" | "trade" | "member_type">[])
    .filter((m) => !restrictToOwnStaff || m.member_type === "personeel")
    .map((m) => ({ id: m.id, name: m.name, trade: m.trade, member_type: m.member_type }));

  return (
    <TeamPlanningPanel
      rows={visibleRows}
      quickJobs={jobs}
      teamMembers={teamMembersForPanel}
      ownStaffMemberId={current.ownStaffMember?.id ?? null}
      accessLevel={accessLevel}
      restrictToOwnStaff={restrictToOwnStaff}
      changeRequests={(changeRequests ?? []) as PlanningChangeRequest[]}
    />
  );
}
