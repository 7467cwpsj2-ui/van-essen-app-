"use server";

import { revalidatePath } from "next/cache";
import { requireOwner, requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getOwnerUserIds, getProjectClientUserIds, getProjectName, getTeamMemberUserIds, sendPushToUsers } from "@/lib/push";

export async function createCompletionPoint(
  projectId: string,
  data: {
    description: string;
    note: string | null;
    responsibleTeamMemberId: string | null;
    deadline: string | null;
    filePath: string | null;
    fileType: "image" | "pdf" | null;
  }
) {
  const current = await requireUser();
  if (current.profile.role !== "eigenaar" && current.profile.role !== "klant") {
    throw new Error("Geen toegang.");
  }
  if (!data.description.trim()) throw new Error("Omschrijving is verplicht.");
  const supabase = createClient();
  const isClient = current.profile.role === "klant";

  let responsibleName: string | null = null;
  if (!isClient && data.responsibleTeamMemberId) {
    const { data: member } = await supabase.from("team_members").select("name").eq("id", data.responsibleTeamMemberId).single();
    responsibleName = member?.name ?? null;
  }

  const { error } = await supabase.from("completion_points").insert({
    project_id: projectId,
    description: data.description.trim(),
    note: data.note?.trim() || null,
    responsible_team_member_id: isClient ? null : data.responsibleTeamMemberId,
    responsible_name: isClient ? null : responsibleName,
    deadline: isClient ? null : data.deadline || null,
    photo_path: data.filePath,
    file_type: data.fileType,
    status: isClient ? "nieuw" : "open",
  });
  if (error) throw new Error(error.message);
  revalidatePath(`/projects/${projectId}/opleverpunten`);

  const projectName = await getProjectName(projectId);
  if (isClient) {
    const recipients = await getOwnerUserIds(current.id);
    if (recipients.length) {
      await sendPushToUsers(recipients, {
        title: `Nieuw opleverpunt van klant — ${projectName}`,
        body: data.description.trim(),
        url: `/projects/${projectId}/opleverpunten`,
      });
    }
  } else if (data.responsibleTeamMemberId) {
    const recipients = await getTeamMemberUserIds(data.responsibleTeamMemberId, current.id);
    if (recipients.length) {
      await sendPushToUsers(recipients, {
        title: `Nieuw opleverpunt — ${projectName}`,
        body: data.description.trim(),
        url: `/projects/${projectId}/opleverpunten`,
      });
    }
  }
}

export async function reviewCompletionPoint(
  projectId: string,
  id: string,
  data: { responsibleTeamMemberId: string; deadline: string | null }
) {
  const current = await requireOwner();
  if (!data.responsibleTeamMemberId) throw new Error("Kies een verantwoordelijke.");
  const supabase = createClient();
  const { data: member } = await supabase.from("team_members").select("name").eq("id", data.responsibleTeamMemberId).single();

  const { error } = await supabase
    .from("completion_points")
    .update({
      responsible_team_member_id: data.responsibleTeamMemberId,
      responsible_name: member?.name ?? null,
      deadline: data.deadline || null,
      status: "open",
    })
    .eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath(`/projects/${projectId}/opleverpunten`);

  const recipients = await getTeamMemberUserIds(data.responsibleTeamMemberId, current.id);
  if (recipients.length) {
    const projectName = await getProjectName(projectId);
    await sendPushToUsers(recipients, {
      title: `Nieuw opleverpunt — ${projectName}`,
      body: "Er is een opleverpunt aan je toegewezen.",
      url: `/projects/${projectId}/opleverpunten`,
    });
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
