"use server";

import { revalidatePath } from "next/cache";
import { requireOwner, requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getOwnerUserIds, getProjectClientUserIds, getProjectName, getTeamMemberUserIds, sendPushToUsers } from "@/lib/push";

export async function createCompletionPoint(
  projectId: string,
  data: { description: string; responsibleTeamMemberId: string | null; deadline: string | null; photoPath: string | null }
) {
  const current = await requireOwner();
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

  if (data.responsibleTeamMemberId) {
    const recipients = await getTeamMemberUserIds(data.responsibleTeamMemberId, current.id);
    if (recipients.length) {
      const projectName = await getProjectName(projectId);
      await sendPushToUsers(recipients, {
        title: `Nieuw opleverpunt — ${projectName}`,
        body: data.description.trim(),
        url: `/projects/${projectId}/opleverpunten`,
      });
    }
  }
}

export async function markCompletionPointReady(projectId: string, id: string) {
  const current = await requireUser();
  const supabase = createClient();
  const { error } = await supabase.rpc("mark_completion_point_ready", { p_id: id });
  if (error) throw new Error(error.message);
  revalidatePath(`/projects/${projectId}/opleverpunten`);

  const [owners, clients] = await Promise.all([getOwnerUserIds(current.id), getProjectClientUserIds(projectId, current.id)]);
  const recipients = Array.from(new Set([...owners, ...clients]));
  if (recipients.length) {
    const projectName = await getProjectName(projectId);
    await sendPushToUsers(recipients, {
      title: `Opleverpunt gereed gemeld — ${projectName}`,
      body: "Er staat een opleverpunt klaar om goed te keuren.",
      url: `/projects/${projectId}/opleverpunten`,
    });
  }
}

export async function approveCompletionPoint(projectId: string, id: string) {
  const current = await requireUser();
  const supabase = createClient();
  const { data: point } = await supabase.from("completion_points").select("responsible_team_member_id").eq("id", id).single();
  const { error } = await supabase.rpc("approve_completion_point", { p_id: id });
  if (error) throw new Error(error.message);
  revalidatePath(`/projects/${projectId}/opleverpunten`);

  const owners = await getOwnerUserIds(current.id);
  const responsible = point?.responsible_team_member_id
    ? await getTeamMemberUserIds(point.responsible_team_member_id as string, current.id)
    : [];
  const recipients = Array.from(new Set([...owners, ...responsible]));
  if (recipients.length) {
    const projectName = await getProjectName(projectId);
    await sendPushToUsers(recipients, {
      title: `Opleverpunt goedgekeurd — ${projectName}`,
      body: "Een opleverpunt is goedgekeurd.",
      url: `/projects/${projectId}/opleverpunten`,
    });
  }
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
