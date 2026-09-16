"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getAllStaffUserIds, getOwnerUserIds, getTeamMemberUserIds, sendPushToUsers } from "@/lib/push";
import type { GeneralTaskAssigneeType } from "@/types/database";

export async function createGeneralTask(data: {
  title: string;
  assigneeType: GeneralTaskAssigneeType;
  assigneeTeamMemberIds: string[];
  dueDate: string | null;
}) {
  const current = await requireUser();
  if (!data.title.trim()) throw new Error("Titel is verplicht.");
  const supabase = createClient();
  const { error } = await supabase.from("general_tasks").insert({
    title: data.title.trim(),
    assignee_type: data.assigneeType,
    assignee_team_member_ids: data.assigneeType === "team" ? data.assigneeTeamMemberIds : [],
    due_date: data.dueDate || null,
  });
  if (error) throw new Error(error.message);
  revalidatePath("/te-doen");
  revalidatePath("/dashboard");

  let recipients: string[] = [];
  if (data.assigneeType === "eigenaar") {
    recipients = await getOwnerUserIds(current.id);
  } else if (data.assigneeTeamMemberIds.length > 0) {
    const lists = await Promise.all(data.assigneeTeamMemberIds.map((id) => getTeamMemberUserIds(id, current.id)));
    recipients = Array.from(new Set(lists.flat()));
  } else {
    recipients = await getAllStaffUserIds(current.id);
  }
  if (recipients.length) {
    await sendPushToUsers(recipients, {
      title: "Nieuw algemeen te doen",
      body: data.title.trim(),
      url: "/te-doen",
    });
  }
}

export async function toggleGeneralTask(taskId: string, done: boolean) {
  const current = await requireUser();
  const supabase = createClient();
  const { error } = await supabase
    .from("general_tasks")
    .update({ done, done_by: done ? current.profile.name : null, done_at: done ? new Date().toISOString() : null })
    .eq("id", taskId);
  if (error) throw new Error(error.message);
  revalidatePath("/te-doen");
  revalidatePath("/dashboard");
}

export async function deleteGeneralTask(taskId: string) {
  await requireUser();
  const supabase = createClient();
  const { error } = await supabase.from("general_tasks").delete().eq("id", taskId);
  if (error) throw new Error(error.message);
  revalidatePath("/te-doen");
  revalidatePath("/dashboard");
}
