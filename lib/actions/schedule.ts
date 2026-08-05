"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export async function createPhase(
  projectId: string,
  data: { title: string; assignee: string | null; start: string; end: string }
) {
  await requireUser();
  if (!data.title.trim() || !data.start || !data.end) throw new Error("Titel, startdatum en einddatum zijn verplicht.");
  const supabase = createClient();
  const { error } = await supabase.from("schedule_phases").insert({
    project_id: projectId,
    title: data.title.trim(),
    assignee: data.assignee || null,
    start_date: data.start,
    end_date: data.end,
  });
  if (error) throw new Error(error.message);
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
