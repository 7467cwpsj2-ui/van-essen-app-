"use server";

import { revalidatePath } from "next/cache";
import { requireOwner } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export async function createQuickJob(data: {
  title: string;
  assignee: string | null;
  assigneeTeamMemberIds: string[];
  start: string;
  end: string;
}) {
  await requireOwner();
  if (!data.title.trim() || !data.start || !data.end) throw new Error("Titel, startdatum en einddatum zijn verplicht.");
  const supabase = createClient();
  const { error } = await supabase.from("quick_jobs").insert({
    title: data.title.trim(),
    assignee: data.assigneeTeamMemberIds.length > 0 ? null : data.assignee || null,
    assignee_team_member_ids: data.assigneeTeamMemberIds,
    start_date: data.start,
    end_date: data.end,
  });
  if (error) throw new Error(error.message);
  revalidatePath("/planning-overzicht");
}

export async function updateQuickJob(
  id: string,
  data: { title: string; assignee: string | null; assigneeTeamMemberIds: string[]; start: string; end: string }
) {
  await requireOwner();
  if (!data.title.trim() || !data.start || !data.end) throw new Error("Titel, startdatum en einddatum zijn verplicht.");
  const supabase = createClient();
  const { error } = await supabase
    .from("quick_jobs")
    .update({
      title: data.title.trim(),
      assignee: data.assigneeTeamMemberIds.length > 0 ? null : data.assignee || null,
      assignee_team_member_ids: data.assigneeTeamMemberIds,
      start_date: data.start,
      end_date: data.end,
    })
    .eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/planning-overzicht");
}

export async function toggleQuickJobDone(id: string, done: boolean) {
  await requireOwner();
  const supabase = createClient();
  const { error } = await supabase.from("quick_jobs").update({ done }).eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/planning-overzicht");
}

export async function deleteQuickJob(id: string) {
  await requireOwner();
  const supabase = createClient();
  const { error } = await supabase.from("quick_jobs").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/planning-overzicht");
}
