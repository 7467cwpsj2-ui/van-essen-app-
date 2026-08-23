import { createClient } from "@/lib/supabase/server";
import { projectProgress } from "@/lib/progress";
import { getProjectClientNamesMap } from "@/lib/clientNames";
import type { AppNotification, Project, Role, SchedulePhase } from "@/types/database";

export interface ProjectWithProgress extends Project {
  clientName: string | null;
  progress: number;
  coverPhotoUrl: string | null;
}

// RLS beperkt dit vanzelf tot de projecten waar de ingelogde
// gebruiker toegang toe heeft.
export async function getProjectsWithProgress(): Promise<ProjectWithProgress[]> {
  const supabase = createClient();
  const { data: projects } = await supabase.from("projects").select("*").order("created_at", { ascending: false });
  const projectRows = (projects ?? []) as Project[];

  const clientNameMap = await getProjectClientNamesMap(supabase, projectRows.map((p) => ({ id: p.id, client_id: p.client_id })));

  return Promise.all(
    projectRows.map(async (p) => {
      const { data: phases } = await supabase.from("schedule_phases").select("*").eq("project_id", p.id);
      let coverPhotoUrl: string | null = null;
      if (p.cover_photo_path) {
        const { data: signed } = await supabase.storage.from("project-files").createSignedUrl(p.cover_photo_path, 3600);
        coverPhotoUrl = signed?.signedUrl ?? null;
      }
      return {
        ...p,
        clientName: clientNameMap[p.id] ?? null,
        progress: projectProgress((phases ?? []) as SchedulePhase[]),
        coverPhotoUrl,
      };
    })
  );
}

export interface TodayTask {
  id: string;
  title: string;
  projectId: string;
  projectName: string;
  assigneeType: "eigenaar" | "team" | "klant";
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
  projectName: string;
  start_date: string;
  end_date: string;
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
      projectName: p.projects?.name ?? "project",
      start_date: p.start_date,
      end_date: p.end_date,
    });
  }
  for (const j of (jobs ?? []) as { id: string; title: string; start_date: string; end_date: string }[]) {
    items.push({ id: `qj:${j.id}`, title: j.title, projectId: null, projectName: "Losse klus", start_date: j.start_date, end_date: j.end_date });
  }
  items.sort((a, b) => a.start_date.localeCompare(b.start_date));
  return items.slice(0, 8);
}

export interface StaffTodayItem {
  teamMemberId: string;
  teamMemberName: string;
  title: string;
  projectId: string | null;
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
      .gte("end_date", todayIso),
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
      items.push({ teamMemberId: memberId, teamMemberName: name, title: p.title, projectId: p.project_id, projectName: p.projects?.name ?? "project" });
    }
  }
  for (const j of (jobs ?? []) as { id: string; title: string; assignee_team_member_ids: string[] }[]) {
    for (const memberId of j.assignee_team_member_ids) {
      const name = nameById.get(memberId);
      if (!name) continue;
      items.push({ teamMemberId: memberId, teamMemberName: name, title: j.title, projectId: null, projectName: "Losse klus" });
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

export interface DirectMessageThread {
  teamMemberId: string;
  name: string;
  memberType: string;
  trade: string | null;
  lastText: string | null;
  lastFileType: "image" | "pdf" | null;
  lastAt: string | null;
  unreadCount: number;
}

// Eén rij per teamlid/onderaannemer, met het laatste bericht en het
// aantal ongelezen berichten — de "gesprekkenlijst" voor de eigenaar,
// zoals bij WhatsApp. RLS laat de eigenaar alle direct_messages zien,
// dus dit hoeft niet per teamlid apart bevraagd te worden.
export async function getDirectMessageThreads(): Promise<DirectMessageThread[]> {
  const supabase = createClient();
  const { data: members } = await supabase.from("team_members").select("id,name,member_type,trade").order("name");
  const teamMembers = (members ?? []) as { id: string; name: string; member_type: string; trade: string | null }[];
  if (teamMembers.length === 0) return [];

  const { data: messagesData } = await supabase
    .from("direct_messages")
    .select("team_member_id,text,file_type,created_at,read_by_owner")
    .order("created_at", { ascending: false });
  const messages = (messagesData ?? []) as {
    team_member_id: string;
    text: string;
    file_type: "image" | "pdf" | null;
    created_at: string;
    read_by_owner: boolean;
  }[];

  return teamMembers
    .map((m) => {
      const own = messages.filter((msg) => msg.team_member_id === m.id);
      const last = own[0] ?? null;
      return {
        teamMemberId: m.id,
        name: m.name,
        memberType: m.member_type,
        trade: m.trade,
        lastText: last?.text ?? null,
        lastFileType: last?.file_type ?? null,
        lastAt: last?.created_at ?? null,
        unreadCount: own.filter((msg) => !msg.read_by_owner).length,
      };
    })
    .sort((a, b) => {
      if (!a.lastAt && !b.lastAt) return a.name.localeCompare(b.name, "nl");
      if (!a.lastAt) return 1;
      if (!b.lastAt) return -1;
      return b.lastAt.localeCompare(a.lastAt);
    });
}

// Werkt voor eigenaar én teamlid met dezelfde query: RLS laat de
// eigenaar alle direct_messages zien (dus dit telt automatisch over alle
// gesprekken heen) en een teamlid alleen zijn eigen gesprek met de
// eigenaar (dus dit telt dan vanzelf alleen dat ene gesprek).
export async function getUnreadDirectMessageCount(role: Role): Promise<number> {
  if (role === "klant") return 0;
  const supabase = createClient();
  const { count } = await supabase
    .from("direct_messages")
    .select("id", { count: "exact", head: true })
    .eq(role === "eigenaar" ? "read_by_owner" : "read_by_member", false);
  return count ?? 0;
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
        .eq("due_date", today)
        .eq("done", false),
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
