import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { MyPlanningPanel, type MyPlanEntry } from "@/components/MyPlanningPanel";
import { mondayOfWeek } from "@/lib/workingDays";
import type { DayPart, QuickJob, QuickJobDayAssignment } from "@/types/database";

// Aaneengesloten reeks dagen (met hetzelfde dagdeel) voor dit ene
// teamlid tot één blok samenvoegen — zelfde aanpak als de algemene
// planning, maar dan voor precies één persoon i.p.v. iedereen tegelijk.
function memberStreaks(memberId: string, dayAssignments: QuickJobDayAssignment[]): { start: string; end: string; daypart: DayPart }[] {
  const entries = dayAssignments
    .filter((d) => d.team_member_ids.includes(memberId))
    .map((d) => ({ date: d.date, daypart: (d.daypart ?? "dag") as DayPart }))
    .sort((a, b) => a.date.localeCompare(b.date));
  if (entries.length === 0) return [];
  const streaks: { start: string; end: string; daypart: DayPart }[] = [];
  let rangeStart = entries[0].date;
  let rangeDaypart = entries[0].daypart;
  let prev = entries[0];
  for (let i = 1; i < entries.length; i++) {
    const gapDays = (new Date(entries[i].date + "T00:00:00Z").getTime() - new Date(prev.date + "T00:00:00Z").getTime()) / 86400000;
    if (gapDays > 3 || entries[i].daypart !== rangeDaypart) {
      streaks.push({ start: rangeStart, end: prev.date, daypart: rangeDaypart });
      rangeStart = entries[i].date;
      rangeDaypart = entries[i].daypart;
    }
    prev = entries[i];
  }
  streaks.push({ start: rangeStart, end: prev.date, daypart: rangeDaypart });
  return streaks;
}

export default async function MijnPlanningPage() {
  const current = await requireUser();
  const myStaffId = current.profile.role === "team" ? current.profile.team_member_id : current.ownStaffMember?.id ?? null;
  if (!myStaffId) notFound();

  const supabase = createClient();
  const todayIso = new Date().toISOString().slice(0, 10);

  const [{ data: phases }, { data: jobs }] = await Promise.all([
    supabase
      .from("schedule_phases")
      .select("id,project_id,title,start_date,end_date,fixed_date,projects(name,planning_color)")
      .contains("assignee_team_member_ids", [myStaffId])
      .gte("end_date", todayIso)
      .order("start_date"),
    supabase
      .from("quick_jobs")
      .select("*")
      .contains("assignee_team_member_ids", [myStaffId])
      .gte("end_date", todayIso)
      .order("start_date"),
  ]);

  const entries: MyPlanEntry[] = [];

  for (const p of (phases ?? []) as unknown as {
    id: string;
    project_id: string;
    title: string;
    start_date: string;
    end_date: string;
    fixed_date: boolean;
    projects: { name: string; planning_color: string | null } | null;
  }[]) {
    entries.push({
      id: p.id,
      title: p.title,
      subtitle: p.projects?.name ?? "onbekend project",
      projectId: p.project_id,
      quickJobId: null,
      kind: "klus",
      color: p.projects?.planning_color ?? null,
      start_date: p.start_date,
      end_date: p.end_date,
      daypart: "dag",
      done: false,
      fixedDate: p.fixed_date,
    });
  }

  for (const j of (jobs ?? []) as QuickJob[]) {
    const base = {
      title: j.kind === "kantoor" ? "Kantoor" : j.kind === "verlof" ? "Vakantie" : j.title,
      subtitle: j.kind === "klus" ? j.address : null,
      projectId: null,
      quickJobId: j.id,
      kind: j.kind,
      color: j.color,
      done: j.done,
      fixedDate: false,
    };
    if (j.day_assignments && j.day_assignments.length > 0) {
      const streaks = memberStreaks(myStaffId, j.day_assignments);
      streaks.forEach((s, idx) => {
        entries.push({ id: `qj:${j.id}:${idx}`, ...base, start_date: s.start, end_date: s.end, daypart: s.daypart });
      });
    } else {
      entries.push({ id: `qj:${j.id}`, ...base, start_date: j.start_date, end_date: j.end_date, daypart: j.daypart });
    }
  }

  entries.sort((a, b) => a.start_date.localeCompare(b.start_date));

  const weeks = new Map<string, MyPlanEntry[]>();
  for (const e of entries) {
    const key = mondayOfWeek(e.start_date);
    if (!weeks.has(key)) weeks.set(key, []);
    weeks.get(key)!.push(e);
  }

  return <MyPlanningPanel weeks={Array.from(weeks.entries())} />;
}
