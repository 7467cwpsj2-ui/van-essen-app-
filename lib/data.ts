import { createClient } from "@/lib/supabase/server";
import { projectProgress } from "@/lib/progress";
import type { Project, SchedulePhase, Task } from "@/types/database";

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
      const [{ data: phases }, { data: tasks }] = await Promise.all([
        supabase.from("schedule_phases").select("*").eq("project_id", p.id),
        supabase.from("tasks").select("*").eq("project_id", p.id),
      ]);
      return {
        ...p,
        clientName: p.client_id ? clientMap[p.client_id] ?? null : null,
        progress: projectProgress((phases ?? []) as SchedulePhase[], (tasks ?? []) as Task[]),
      };
    })
  );
}
