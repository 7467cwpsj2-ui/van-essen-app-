"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import {
  getOwnerUserIds,
  getProjectClientUserIds,
  getProjectInternalUserIds,
  getProjectName,
  getTeamMemberUserIds,
  sendPushToUsers,
} from "@/lib/push";
import type { TaskAssigneeType } from "@/types/database";

export async function createTask(
  projectId: string,
  data: { title: string; assigneeType: TaskAssigneeType; assigneeTeamMemberIds: string[]; dueDate: string | null }
) {
  const current = await requireUser();
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

  let recipients: string[] = [];
  if (data.assigneeType === "eigenaar") {
    recipients = await getOwnerUserIds(current.id);
  } else if (data.assigneeType === "klant") {
    recipients = await getProjectClientUserIds(projectId, current.id);
  } else if (data.assigneeType === "team") {
    if (data.assigneeTeamMemberIds.length > 0) {
      const lists = await Promise.all(data.assigneeTeamMemberIds.map((id) => getTeamMemberUserIds(id, current.id)));
      recipients = Array.from(new Set(lists.flat()));
    } else {
      recipients = await getProjectInternalUserIds(projectId, current.id);
    }
  }
  if (recipients.length) {
    const projectName = await getProjectName(projectId);
    await sendPushToUsers(recipients, {
      title: `Nieuw te doen — ${projectName}`,
      body: data.title.trim(),
      url: `/projects/${projectId}/planning`,
    });
  }
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
