"use server";

import { revalidatePath } from "next/cache";
import { requireOwner } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { permissionsFromFormData } from "@/lib/permissionsFromFormData";
import { getProjectName, getTeamMemberUserIds, sendPushToUsers } from "@/lib/push";
import { defaultPermissions, type ModuleKey } from "@/types/database";

export async function inviteTeamMember(formData: FormData) {
  await requireOwner();
  const name = String(formData.get("name") || "").trim();
  const email = String(formData.get("email") || "").trim();
  const trade = String(formData.get("trade") || "").trim() || null;
  if (!name || !email) throw new Error("Naam en e-mailadres zijn verplicht.");

  const supabase = createClient();
  const { data: member, error: memberError } = await supabase
    .from("team_members")
    .insert({ name, trade, permissions: permissionsFromFormData(formData), sees_all_projects: true })
    .select()
    .single();
  if (memberError || !member) throw new Error(memberError?.message || "Kon teamlid niet aanmaken.");

  const admin = createAdminClient();
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
  const { data: invited, error: inviteError } = await admin.auth.admin.inviteUserByEmail(email, {
    redirectTo: `${siteUrl}/auth/callback?next=${encodeURIComponent("/account/wachtwoord?onboarding=1")}`,
  });

  if (inviteError || !invited?.user) {
    await supabase.from("team_members").delete().eq("id", member.id);
    throw new Error(inviteError?.message || "Uitnodigen mislukt.");
  }

  const { error: profileError } = await admin
    .from("profiles")
    .insert({ id: invited.user.id, role: "team", name, team_member_id: member.id });

  if (profileError) {
    await admin.auth.admin.deleteUser(invited.user.id);
    await supabase.from("team_members").delete().eq("id", member.id);
    throw new Error(profileError.message);
  }

  revalidatePath("/team");
}

export async function updateTeamMemberDetails(id: string, patch: { name?: string; trade?: string | null }) {
  await requireOwner();
  const supabase = createClient();
  const { error } = await supabase.from("team_members").update(patch).eq("id", id);
  if (error) throw new Error(error.message);
  if (patch.name) {
    await supabase.from("profiles").update({ name: patch.name }).eq("team_member_id", id);
  }
  revalidatePath("/team");
}

export async function toggleTeamModulePermission(id: string, moduleKey: ModuleKey, value: boolean) {
  await requireOwner();
  const supabase = createClient();
  const { data: member } = await supabase.from("team_members").select("permissions").eq("id", id).single();
  const permissions = { ...(member?.permissions ?? defaultPermissions()), [moduleKey]: value };
  const { error } = await supabase.from("team_members").update({ permissions }).eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/team");
}

export async function toggleTeamCanEditSchedule(id: string, value: boolean) {
  await requireOwner();
  const supabase = createClient();
  const { error } = await supabase.from("team_members").update({ can_edit_schedule: value }).eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/team");
}

export async function toggleTeamSeesAllProjects(id: string, value: boolean) {
  await requireOwner();
  const supabase = createClient();
  const { error } = await supabase.from("team_members").update({ sees_all_projects: value }).eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/team");
}

export async function toggleTeamProjectAccess(teamMemberId: string, projectId: string, granted: boolean) {
  await requireOwner();
  const supabase = createClient();
  if (granted) {
    const { error } = await supabase.from("project_team_access").insert({ team_member_id: teamMemberId, project_id: projectId });
    if (error) throw new Error(error.message);

    const recipients = await getTeamMemberUserIds(teamMemberId);
    if (recipients.length) {
      const projectName = await getProjectName(projectId);
      await sendPushToUsers(recipients, {
        title: "Nieuw project toegevoegd",
        body: `Je hebt nu toegang tot ${projectName}.`,
        url: `/projects/${projectId}/planning`,
      });
    }
  } else {
    const { error } = await supabase
      .from("project_team_access")
      .delete()
      .eq("team_member_id", teamMemberId)
      .eq("project_id", projectId);
    if (error) throw new Error(error.message);
  }
  revalidatePath("/team");
}

export async function removeTeamMember(id: string) {
  await requireOwner();
  const supabase = createClient();
  const admin = createAdminClient();

  const { data: profiles } = await supabase.from("profiles").select("id").eq("team_member_id", id);
  for (const p of profiles ?? []) {
    const { error: deleteUserError } = await admin.auth.admin.deleteUser(p.id);
    if (deleteUserError) throw new Error(deleteUserError.message);
  }
  const { error } = await supabase.from("team_members").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/team");
}
