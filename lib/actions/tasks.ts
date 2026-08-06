"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { TaskAssigneeType } from "@/types/database";

export async function createTask(
  projectId: string,
  data: { title: string; assigneeType: TaskAssigneeType; assigneeTeamMemberIds: string[]; dueDate: string | null }
) {
  await requireUser();
  if (!data.title.trim()) throw new Error("Titel is verplicht.");
  const supabase = createClient();
  const { error } = await supabase.from("tasks").insert({
    project_id: projectId,
    title: data.title.trim(),
    assignee_type: data.assigneeType,
    assignee_team_member_ids: data.assigneeType === "team" ? data.assigneeTeamMemberIds : [],
    due_date: data.dueDate || null,
  });
  if (error) throw new Error(error.message);
  revalidatePath(`/projects/${projectId}/planning`);
  revalidatePath("/dashboard");
}

export async function toggleTask(projectId: string, taskId: string, done: boolean) {
  const current = await requireUser();
  const supabase = createClient();
  const { error } = await supabase
    .from("tasks")
    .update({ done, done_by: done ? current.profile.name : null, done_at: done ? new Date().toISOString() : null })
    .eq("id", taskId);
  if (error) throw new Error(error.message);
  revalidatePath(`/projects/${projectId}/planning`);
  revalidatePath("/dashboard");
}

export async function deleteTask(projectId: string, taskId: string) {
  await requireUser();
  const supabase = createClient();
  const { error } = await supabase.from("tasks").delete().eq("id", taskId);
  if (error) throw new Error(error.message);
  revalidatePath(`/projects/${projectId}/planning`);
  revalidatePath("/dashboard");
}
