"use server";

import { revalidatePath } from "next/cache";
import { requireOwner, requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export async function createCompletionPoint(
  projectId: string,
  data: { description: string; responsibleTeamMemberId: string | null; deadline: string | null; photoPath: string | null }
) {
  await requireOwner();
  if (!data.description.trim()) throw new Error("Omschrijving is verplicht.");
  const supabase = createClient();

  let responsibleName: string | null = null;
  if (data.responsibleTeamMemberId) {
    const { data: member } = await supabase.from("team_members").select("name").eq("id", data.responsibleTeamMemberId).single();
    responsibleName = member?.name ?? null;
  }

  const { error } = await supabase.from("completion_points").insert({
    project_id: projectId,
    description: data.description.trim(),
    responsible_team_member_id: data.responsibleTeamMemberId,
    responsible_name: responsibleName,
    deadline: data.deadline || null,
    photo_path: data.photoPath,
  });
  if (error) throw new Error(error.message);
  revalidatePath(`/projects/${projectId}/opleverpunten`);
}

export async function markCompletionPointReady(projectId: string, id: string) {
  await requireUser();
  const supabase = createClient();
  const { error } = await supabase.rpc("mark_completion_point_ready", { p_id: id });
  if (error) throw new Error(error.message);
  revalidatePath(`/projects/${projectId}/opleverpunten`);
}

export async function approveCompletionPoint(projectId: string, id: string) {
  await requireUser();
  const supabase = createClient();
  const { error } = await supabase.rpc("approve_completion_point", { p_id: id });
  if (error) throw new Error(error.message);
  revalidatePath(`/projects/${projectId}/opleverpunten`);
}

export async function resetCompletionPoint(projectId: string, id: string) {
  await requireOwner();
  const supabase = createClient();
  const { error } = await supabase.rpc("reset_completion_point", { p_id: id });
  if (error) throw new Error(error.message);
  revalidatePath(`/projects/${projectId}/opleverpunten`);
}

export async function deleteCompletionPoint(projectId: string, id: string) {
  await requireOwner();
  const supabase = createClient();
  const { error } = await supabase.from("completion_points").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath(`/projects/${projectId}/opleverpunten`);
}
