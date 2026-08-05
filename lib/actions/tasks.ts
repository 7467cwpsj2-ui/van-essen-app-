"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export async function createTask(
  projectId: string,
  data: { title: string; assignee: string | null; dueDate: string | null; phaseId: string | null }
) {
  await requireUser();
  if (!data.title.trim()) throw new Error("Titel is verplicht.");
  const supabase = createClient();
  const { error } = await supabase.from("tasks").insert({
    project_id: projectId,
    title: data.title.trim(),
    assignee: data.assignee || null,
    due_date: data.dueDate || null,
    phase_id: data.phaseId || null,
  });
  if (error) throw new Error(error.message);
  revalidatePath(`/projects/${projectId}/planning`);
}

export async function toggleTask(projectId: string, taskId: string, done: boolean) {
  await requireUser();
  const supabase = createClient();
  const { error } = await supabase.from("tasks").update({ done }).eq("id", taskId);
  if (error) throw new Error(error.message);
  revalidatePath(`/projects/${projectId}/planning`);
}

export async function deleteTask(projectId: string, taskId: string) {
  await requireUser();
  const supabase = createClient();
  const { error } = await supabase.from("tasks").delete().eq("id", taskId);
  if (error) throw new Error(error.message);
  revalidatePath(`/projects/${projectId}/planning`);
}
