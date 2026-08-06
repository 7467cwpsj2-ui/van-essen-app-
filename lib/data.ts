import { createClient } from "@/lib/supabase/server";
import { projectProgress } from "@/lib/progress";
import type { Project, SchedulePhase } from "@/types/database";

export interface ProjectWithProgress extends Project {
  clientName: string | null;
  progress: number;
}

// RLS beperkt dit vanzelf tot de projecten waar de ingelogde
// gebruiker toegang toe heeft.
export async function getProjectsWithProgress(): Promise<ProjectWithProgress[]> {
  const supabase = createClient();
  const { data: projects } = await supabase.from("projects").select("*").order("created_at", { ascending: false });
  const projectRows = (projects ?? []) as Project[];

  const clientIds = Array.from(new Set(projectRows.map((p) => p.client_id).filter(Boolean))) as string[];
  const clientMap: Record<string, string> = {};
  if (clientIds.length) {
    const { data: clients } = await supabase.from("clients").select("id,name").in("id", clientIds);
    (clients ?? []).forEach((c) => {
      clientMap[c.id as string] = c.name as string;
    });
  }

  return Promise.all(
    projectRows.map(async (p) => {
      const { data: phases } = await supabase.from("schedule_phases").select("*").eq("project_id", p.id);
      return {
        ...p,
        clientName: p.client_id ? clientMap[p.client_id] ?? null : null,
        progress: projectProgress((phases ?? []) as SchedulePhase[]),
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
  projectName: string;
  createdAt: string;
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
      projectName: projectNameMap[w.project_id as string] ?? "",
      createdAt: w.created_at as string,
    })),
    ...(recentPhotos ?? []).map((ph) => ({
      id: `p-${ph.id}`,
      kind: "foto" as const,
      text: `Foto toegevoegd: ${ph.title}`,
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
