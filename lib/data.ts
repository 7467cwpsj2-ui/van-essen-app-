import { cache } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { projectProgress } from "@/lib/progress";
import { getProjectClientNamesMap } from "@/lib/clientNames";
import type { AppNotification, Project, SchedulePhase } from "@/types/database";

export interface ProjectWithProgress extends Project {
  clientName: string | null;
  progress: number;
  coverPhotoUrl: string | null;
}

async function signedCoverUrls(supabase: SupabaseClient, paths: string[]): Promise<Map<string, string | null>> {
  if (paths.length === 0) return new Map();
  const { data } = await supabase.storage.from("project-files").createSignedUrls(paths, 3600);
  return new Map(paths.map((path, i) => [path, data?.[i]?.signedUrl ?? null]));
}

// RLS beperkt dit vanzelf tot de projecten waar de ingelogde
// gebruiker toegang toe heeft. Draait op vrijwel elke paginanavigatie
// (ook vanuit de layout, voor de zijbalk), dus fases en cover-foto's
// worden bewust in telkens één bulk-aanroep opgehaald i.p.v. één per
// project — bij bijv. 15 projecten scheelt dat tientallen losse
// netwerk-round-trips per paginalading. cache() zorgt er daarnaast voor
// dat wanneer zowel de layout als de pagina zelf dit aanroepen (zoals
// op /dashboard en /uren), dat binnen één request maar één keer
// daadwerkelijk wordt uitgevoerd.
export const getProjectsWithProgress = cache(async (): Promise<ProjectWithProgress[]> => {
  const supabase = createClient();
  const { data: projects } = await supabase.from("projects").select("*").order("created_at", { ascending: false });
  const projectRows = (projects ?? []) as Project[];
  if (projectRows.length === 0) return [];

  const projectIds = projectRows.map((p) => p.id);
  const coverPaths = projectRows.map((p) => p.cover_photo_path).filter((path): path is string => !!path);

  const [clientNameMap, phasesResult, signedUrlByPath] = await Promise.all([
    getProjectClientNamesMap(supabase, projectRows.map((p) => ({ id: p.id, client_id: p.client_id }))),
    supabase.from("schedule_phases").select("*").in("project_id", projectIds),
    signedCoverUrls(supabase, coverPaths),
  ]);

  const phasesByProject = new Map<string, SchedulePhase[]>();
  for (const phase of (phasesResult.data ?? []) as SchedulePhase[]) {
    const list = phasesByProject.get(phase.project_id) ?? [];
    list.push(phase);
    phasesByProject.set(phase.project_id, list);
  }

  return projectRows.map((p) => ({
    ...p,
    clientName: clientNameMap[p.id] ?? null,
    progress: projectProgress(phasesByProject.get(p.id) ?? []),
    coverPhotoUrl: (p.cover_photo_path ? signedUrlByPath.get(p.cover_photo_path) : null) ?? null,
  }));
});

export interface TodayTask {
  id: string;
  title: string;
  projectId: string;
  projectName: string;
  assigneeType: "eigenaar" | "team" | "klant";
  dueDate: string;
  overdue: boolean;
}

export interface ActivityItem {
  id: string;
  kind: "meerwerk" | "minderwerk" | "foto";
  text: string;
  projectId: string;
  projectName: string;
  createdAt: string;
}

export interface MyScheduleItem {
  id: string;
  title: string;
  projectId: string | null;
  quickJobId: string | null;
  projectName: string;
  start_date: string;
  end_date: string;
}

// Hoeveel uur dit teamlid vandaag al geregistreerd heeft — voor het
// dashboard-tegeltje dat rechtstreeks naar /uren linkt.
export async function getMyHoursToday(teamMemberId: string): Promise<number> {
  const supabase = createClient();
  const todayIso = new Date().toISOString().slice(0, 10);
  const { data } = await supabase.from("hours").select("hours").eq("team_member_id", teamMemberId).eq("work_date", todayIso);
  return (data ?? []).reduce((s, r) => s + Number(r.hours), 0);
}

// Bouwplanningfases + losse klussen waar dit teamlid zelf op ingepland
// staat — voor "Mijn planning" op het dashboard. RLS zorgt dat een
// teamlid alleen fases uit projecten met toegang, en alleen losse
// klussen waar hij zelf bij staat, terugkrijgt.
export async function getMySchedule(teamMemberId: string): Promise<MyScheduleItem[]> {
  const supabase = createClient();
  const todayIso = new Date().toISOString().slice(0, 10);

  const [{ data: phases }, { data: jobs }] = await Promise.all([
    supabase
      .from("schedule_phases")
      .select("id,project_id,title,start_date,end_date,projects(name)")
      .contains("assignee_team_member_ids", [teamMemberId])
      .gte("end_date", todayIso)
      .order("start_date"),
    supabase
      .from("quick_jobs")
      .select("id,title,start_date,end_date")
      .contains("assignee_team_member_ids", [teamMemberId])
      .gte("end_date", todayIso)
      .order("start_date"),
  ]);

  const items: MyScheduleItem[] = [];
  for (const p of (phases ?? []) as unknown as {
    id: string;
    project_id: string;
    title: string;
    start_date: string;
    end_date: string;
    projects: { name: string } | null;
  }[]) {
    items.push({
      id: p.id,
      title: p.title,
      projectId: p.project_id,
      quickJobId: null,
      projectName: p.projects?.name ?? "project",
      start_date: p.start_date,
      end_date: p.end_date,
    });
  }
  for (const j of (jobs ?? []) as { id: string; title: string; start_date: string; end_date: string }[]) {
    items.push({
      id: `qj:${j.id}`,
      title: j.title,
      projectId: null,
      quickJobId: j.id,
      projectName: "Losse klus",
      start_date: j.start_date,
      end_date: j.end_date,
    });
  }
  items.sort((a, b) => a.start_date.localeCompare(b.start_date));
  return items.slice(0, 8);
}

export interface StaffTodayItem {
  teamMemberId: string;
  teamMemberName: string;
  title: string;
  projectId: string | null;
  quickJobId: string | null;
  projectName: string;
}

// Voor de eigenaar: welk eigen personeelslid staat vandaag waar
// ingepland — bouwplanningfases + losse klussen samen, alleen
// member_type 'personeel' (onderaannemers vallen hier bewust buiten).
export async function getTodayStaffSchedule(): Promise<StaffTodayItem[]> {
  const supabase = createClient();
  const todayIso = new Date().toISOString().slice(0, 10);

  const [{ data: staff }, { data: phases }, { data: jobs }] = await Promise.all([
    supabase.from("team_members").select("id,name").eq("member_type", "personeel"),
    supabase
      .from("schedule_phases")
      .select("id,project_id,title,assignee_team_member_ids,start_date,end_date,projects(name)")
      .lte("start_date", todayIso)
      .gte("end_date", todayIso),
    supabase
      .from("quick_jobs")
      .select("id,title,assignee_team_member_ids,start_date,end_date")
      .lte("start_date", todayIso)
      .gte("end_date", todayIso)
      .eq("done", false),
  ]);

  const staffRows = (staff ?? []) as { id: string; name: string }[];
  const nameById = new Map(staffRows.map((s) => [s.id, s.name]));

  const items: StaffTodayItem[] = [];
  for (const p of (phases ?? []) as unknown as {
    id: string;
    project_id: string;
    title: string;
    assignee_team_member_ids: string[];
    projects: { name: string } | null;
  }[]) {
    for (const memberId of p.assignee_team_member_ids) {
      const name = nameById.get(memberId);
      if (!name) continue;
      items.push({
        teamMemberId: memberId,
        teamMemberName: name,
        title: p.title,
        projectId: p.project_id,
        quickJobId: null,
        projectName: p.projects?.name ?? "project",
      });
    }
  }
  for (const j of (jobs ?? []) as { id: string; title: string; assignee_team_member_ids: string[] }[]) {
    for (const memberId of j.assignee_team_member_ids) {
      const name = nameById.get(memberId);
      if (!name) continue;
      items.push({
        teamMemberId: memberId,
        teamMemberName: name,
        title: j.title,
        projectId: null,
        quickJobId: j.id,
        projectName: "Losse klus",
      });
    }
  }
  items.sort((a, b) => a.teamMemberName.localeCompare(b.teamMemberName, "nl"));
  return items;
}

export interface LeadsSummary {
  openCount: number;
  overdueCount: number;
}

// Voor het dashboard-kaartje "Offertes" — hoeveel aanvragen nog open
// staan, en hoeveel daarvan al langer dan de ingestelde termijn wachten
// op een offerte (dezelfde termijn als de cron-herinnering gebruikt).
export async function getLeadsSummary(): Promise<LeadsSummary> {
  const supabase = createClient();
  const [{ data: settings }, { data: leads }] = await Promise.all([
    supabase.from("app_settings").select("lead_reminder_days").eq("id", true).single(),
    supabase.from("leads").select("id,visit_date").eq("status", "open"),
  ]);
  const reminderDays = (settings?.lead_reminder_days as number | undefined) ?? 3;
  const cutoff = new Date(Date.now() - reminderDays * 86400000).toISOString().slice(0, 10);
  const rows = (leads ?? []) as { id: string; visit_date: string | null }[];
  const overdueCount = rows.filter((l) => l.visit_date && l.visit_date <= cutoff).length;
  return { openCount: rows.length, overdueCount };
}

export interface NotificationsSummary {
  items: AppNotification[];
  unreadCount: number;
}

// Voor het belletje-icoon in de zijbalk — de laatste meldingen van de
// ingelogde gebruiker plus het aantal ongelezen, voor het rode bolletje.
export async function getNotifications(): Promise<NotificationsSummary> {
  const supabase = createClient();
  const [{ data: items }, { count }] = await Promise.all([
    supabase.from("notifications").select("*").order("created_at", { ascending: false }).limit(20),
    supabase.from("notifications").select("id", { count: "exact", head: true }).eq("read", false),
  ]);
  return { items: (items ?? []) as AppNotification[], unreadCount: count ?? 0 };
}

export interface DashboardExtras {
  todayTasks: TodayTask[];
  openMeerwerk: { count: number; amount: number };
  openCompletionPoints: number;
  activity: ActivityItem[];
}

export async function getDashboardExtras(projects: ProjectWithProgress[]): Promise<DashboardExtras> {
  const empty: DashboardExtras = {
    todayTasks: [],
    openMeerwerk: { count: 0, amount: 0 },
    openCompletionPoints: 0,
    activity: [],
  };
  const projectIds = projects.map((p) => p.id);
  if (projectIds.length === 0) return empty;

  const supabase = createClient();
  const projectNameMap: Record<string, string> = {};
  projects.forEach((p) => (projectNameMap[p.id] = p.name));
  const today = new Date().toISOString().slice(0, 10);

  const [{ data: tasksToday }, { data: openWork }, { data: openPoints }, { data: recentWork }, { data: recentPhotos }] =
    await Promise.all([
      supabase
        .from("tasks")
        .select("id,project_id,title,assignee_type,due_date,done")
        .in("project_id", projectIds)
        .lte("due_date", today)
        .eq("done", false)
        .order("due_date", { ascending: true }),
      supabase.from("extra_work").select("id,amount,status").in("project_id", projectIds).eq("status", "open"),
      supabase.from("completion_points").select("id,status").in("project_id", projectIds).neq("status", "goedgekeurd"),
      supabase
        .from("extra_work")
        .select("id,project_id,type,description,created_at")
        .in("project_id", projectIds)
        .order("created_at", { ascending: false })
        .limit(5),
      supabase
        .from("photos")
        .select("id,project_id,title,created_at")
        .in("project_id", projectIds)
        .order("created_at", { ascending: false })
        .limit(5),
    ]);

  const todayTasks: TodayTask[] = (tasksToday ?? []).map((t) => ({
    id: t.id as string,
    title: t.title as string,
    projectId: t.project_id as string,
    projectName: projectNameMap[t.project_id as string] ?? "",
    assigneeType: t.assignee_type as TodayTask["assigneeType"],
    dueDate: t.due_date as string,
    overdue: (t.due_date as string) < today,
  }));

  const openMeerwerk = {
    count: (openWork ?? []).length,
    amount: (openWork ?? []).reduce((s, w) => s + Number(w.amount), 0),
  };

  const activity: ActivityItem[] = [
    ...(recentWork ?? []).map((w) => ({
      id: `w-${w.id}`,
      kind: (w.type === "meerwerk" ? "meerwerk" : "minderwerk") as ActivityItem["kind"],
      text: (w.type === "meerwerk" ? "Nieuw meerwerk ontvangen: " : "Nieuw minderwerk ontvangen: ") + w.description,
      projectId: w.project_id as string,
      projectName: projectNameMap[w.project_id as string] ?? "",
      createdAt: w.created_at as string,
    })),
    ...(recentPhotos ?? []).map((ph) => ({
      id: `p-${ph.id}`,
      kind: "foto" as const,
      text: `Foto toegevoegd: ${ph.title}`,
      projectId: ph.project_id as string,
      projectName: projectNameMap[ph.project_id as string] ?? "",
      createdAt: ph.created_at as string,
    })),
  ]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 6);

  return {
    todayTasks,
    openMeerwerk,
    openCompletionPoints: (openPoints ?? []).length,
    activity,
  };
}
