"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export async function createPhase(
  projectId: string,
  data: { title: string; assignee: string | null; assigneeTeamMemberIds: string[]; start: string; end: string }
) {
  await requireUser();
  if (!data.title.trim() || !data.start || !data.end) throw new Error("Titel, startdatum en einddatum zijn verplicht.");
  const supabase = createClient();
  const { error } = await supabase.from("schedule_phases").insert({
    project_id: projectId,
    title: data.title.trim(),
    assignee: data.assigneeTeamMemberIds.length > 0 ? null : data.assignee || null,
    assignee_team_member_ids: data.assigneeTeamMemberIds,
    start_date: data.start,
    end_date: data.end,
  });
  if (error) throw new Error(error.message);
  revalidatePath(`/projects/${projectId}/bouwplanning`);
  revalidatePath(`/projects/${projectId}/planning`);
}

// Puur de datums van een bestaande fase aanpassen — losstaand van
// meerwerk/minderwerk, dus de goedkeuring van een gekoppeld meerwerk-
// item blijft hierdoor altijd ongewijzigd staan. Latere fases (die op
// of na de oorspronkelijke einddatum van deze fase beginnen) schuiven
// automatisch mee, met dezelfde verschuiving in kalenderdagen — zelfde
// principe als bij een meerwerk-verschuiving.
export async function updatePhaseDates(projectId: string, phaseId: string, data: { start: string; end: string }) {
  await requireUser();
  if (!data.start || !data.end) throw new Error("Startdatum en einddatum zijn verplicht.");
  const supabase = createClient();

  const { data: current } = await supabase.from("schedule_phases").select("end_date").eq("id", phaseId).single();
  const oldEnd = current?.end_date as string | undefined;

  const { error } = await supabase.from("schedule_phases").update({ start_date: data.start, end_date: data.end }).eq("id", phaseId);
  if (error) throw new Error(error.message);

  if (oldEnd && oldEnd !== data.end) {
    const deltaDays = Math.round((new Date(data.end).getTime() - new Date(oldEnd).getTime()) / 86400000);
    if (deltaDays !== 0) {
      const { data: laterPhases } = await supabase
        .from("schedule_phases")
        .select("id,start_date,end_date")
        .eq("project_id", projectId)
        .neq("id", phaseId)
        .gte("start_date", oldEnd);
      await Promise.all(
        (laterPhases ?? []).map((p) => {
          const newStart = new Date(new Date(p.start_date as string).getTime() + deltaDays * 86400000).toISOString().slice(0, 10);
          const newEnd = new Date(new Date(p.end_date as string).getTime() + deltaDays * 86400000).toISOString().slice(0, 10);
          return supabase.from("schedule_phases").update({ start_date: newStart, end_date: newEnd }).eq("id", p.id as string);
        })
      );
    }
  }

  revalidatePath(`/projects/${projectId}/bouwplanning`);
  revalidatePath(`/projects/${projectId}/planning`);
}

export async function deletePhase(projectId: string, phaseId: string) {
  await requireUser();
  const supabase = createClient();
  const { error } = await supabase.from("schedule_phases").delete().eq("id", phaseId);
  if (error) throw new Error(error.message);
  revalidatePath(`/projects/${projectId}/bouwplanning`);
  revalidatePath(`/projects/${projectId}/planning`);
}
