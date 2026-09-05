"use server";

import { revalidatePath } from "next/cache";
import { requireOwner } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { siteUrl } from "@/lib/siteUrl";
import { permissionsFromFormData } from "@/lib/permissionsFromFormData";
import { getProjectName, getTeamMemberUserIds, sendPushToUsers } from "@/lib/push";
import {
  defaultPermissions,
  type ModuleKey,
  type PlanningOverzichtAccess,
  type QuickJobDayAssignment,
  type TeamMemberType,
} from "@/types/database";

// De eigenaar wil zichzelf ook kunnen inplannen als eigen personeel —
// bijv. op de bouwplanning of een losse klus — en daarbij dezelfde
// pushmeldingen en uren-registratie krijgen als echt personeel, zonder
// een tweede account nodig te hebben. Dit maakt een gewone
// team_members-rij aan die via owner_profile_id teruggekoppeld wordt
// aan het bestaande eigenaar-profiel (zie migratie 0061) — geen nieuwe
// login, geen wijziging aan de eigenaar-rechten zelf.
export async function addSelfAsStaff() {
  const current = await requireOwner();
  const supabase = createClient();
  const { data: existing } = await supabase.from("team_members").select("id").eq("owner_profile_id", current.id).maybeSingle();
  if (existing) return;
  const { error } = await supabase.from("team_members").insert({
    name: current.profile.name,
    member_type: "personeel",
    sees_all_projects: true,
    permissions: defaultPermissions(),
    owner_profile_id: current.id,
  });
  if (error) throw new Error(error.message);
  revalidatePath("/personeel");
  revalidatePath("/dashboard");
}

export async function inviteTeamMember(formData: FormData): Promise<string> {
  await requireOwner();
  const name = String(formData.get("name") || "").trim();
  const email = String(formData.get("email") || "").trim();
  const trade = String(formData.get("trade") || "").trim() || null;
  const memberTypeRaw = String(formData.get("member_type") || "");
  const memberType: TeamMemberType = memberTypeRaw === "personeel" ? "personeel" : "onderaannemer";
  if (!name || !email) throw new Error("Naam en e-mailadres zijn verplicht.");

  const supabase = createClient();
  const { data: member, error: memberError } = await supabase
    .from("team_members")
    .insert({ name, trade, permissions: permissionsFromFormData(formData), sees_all_projects: true, member_type: memberType })
    .select()
    .single();
  if (memberError || !member) throw new Error(memberError?.message || "Kon teamlid niet aanmaken.");

  const admin = createAdminClient();
  const redirectTo = `${siteUrl()}/auth/callback?next=${encodeURIComponent("/account/wachtwoord?onboarding=1")}`;
  // generateLink i.p.v. inviteUserByEmail: die laatste verstuurt zelf al
  // een e-mail, en een link daarna nóg een keer apart aanmaken voor dit
  // formulier liep tegen Supabase's ingebouwde e-mail-ratelimiet aan
  // (twee auth-mails vlak na elkaar voor hetzelfde adres) — waardoor de
  // link soms stil mislukte en er niks te kopiëren viel. generateLink
  // verstuurt zelf geen mail, dus dat conflict is er nu niet meer; de
  // link staat altijd meteen klaar om te kopiëren en zelf te versturen.
  const { data: linkData, error: linkError } = await admin.auth.admin.generateLink({ type: "invite", email, options: { redirectTo } });

  if (linkError || !linkData?.user) {
    await supabase.from("team_members").delete().eq("id", member.id);
    throw new Error(linkError?.message || "Uitnodigen mislukt.");
  }

  const { error: profileError } = await admin
    .from("profiles")
    .insert({ id: linkData.user.id, role: "team", name, team_member_id: member.id });

  if (profileError) {
    await admin.auth.admin.deleteUser(linkData.user.id);
    await supabase.from("team_members").delete().eq("id", member.id);
    throw new Error(profileError.message);
  }

  revalidatePath("/personeel");
  return linkData.properties.action_link;
}

// Opnieuw uitnodigen als de vorige link is verlopen — zonder het teamlid
// en diens rechten/projectkoppelingen te hoeven verwijderen en opnieuw
// aan te maken. Zie resendClientInvite voor de uitleg van de aanpak.
export async function resendTeamInvite(teamMemberId: string): Promise<string> {
  await requireOwner();
  const supabase = createClient();
  const admin = createAdminClient();
  const { data: profile } = await supabase.from("profiles").select("id").eq("team_member_id", teamMemberId).maybeSingle();
  if (!profile) throw new Error("Geen account gekoppeld aan dit teamlid.");
  const { data: userData, error: userError } = await admin.auth.admin.getUserById(profile.id);
  const email = userData?.user?.email;
  if (userError || !email) throw new Error(userError?.message || "Kon het e-mailadres niet vinden.");

  const { data: link, error } = await admin.auth.admin.generateLink({
    type: "invite",
    email,
    options: { redirectTo: `${siteUrl()}/auth/callback?next=${encodeURIComponent("/account/wachtwoord?onboarding=1")}` },
  });
  if (error || !link?.properties?.action_link) throw new Error(error?.message || "Opnieuw uitnodigen mislukt.");
  revalidatePath("/personeel");
  return link.properties.action_link;
}

export async function updateTeamMemberDetails(
  id: string,
  patch: {
    name?: string;
    trade?: string | null;
    hourly_rate?: number | null;
    hourly_rate_vat_type?: "excl" | "incl";
    color?: string | null;
  }
) {
  await requireOwner();
  const supabase = createClient();
  const { error } = await supabase.from("team_members").update(patch).eq("id", id);
  if (error) throw new Error(error.message);
  if (patch.name) {
    await supabase.from("profiles").update({ name: patch.name }).eq("team_member_id", id);
  }
  revalidatePath("/personeel");
  revalidatePath("/projects", "layout");
}

export async function toggleTeamModulePermission(id: string, moduleKey: ModuleKey, value: boolean) {
  await requireOwner();
  const supabase = createClient();
  const { data: member } = await supabase.from("team_members").select("permissions").eq("id", id).single();
  const permissions = { ...(member?.permissions ?? defaultPermissions()), [moduleKey]: value };
  const { error } = await supabase.from("team_members").update({ permissions }).eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/personeel");
}

export async function toggleTeamCanEditSchedule(id: string, value: boolean) {
  await requireOwner();
  const supabase = createClient();
  const { error } = await supabase.from("team_members").update({ can_edit_schedule: value }).eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/personeel");
}

export async function updateTeamPlanningAccess(id: string, access: PlanningOverzichtAccess) {
  await requireOwner();
  const supabase = createClient();
  const { error } = await supabase.from("team_members").update({ planning_overzicht_access: access }).eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/personeel");
  revalidatePath("/planning-overzicht");
}

export async function updateTeamMemberType(id: string, memberType: TeamMemberType) {
  await requireOwner();
  const supabase = createClient();
  const { error } = await supabase.from("team_members").update({ member_type: memberType }).eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/personeel");
}

export async function toggleTeamSeesAllProjects(id: string, value: boolean) {
  await requireOwner();
  const supabase = createClient();
  const { error } = await supabase.from("team_members").update({ sees_all_projects: value }).eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/personeel");
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
  revalidatePath("/personeel");
}

// assignee_team_member_ids is een uuid[] op fases/taken/losse klussen —
// Postgres kent geen foreign-key-afdwinging op losse array-elementen,
// dus zonder deze opschoning blijft een verwijderd teamlid daar als
// "verweesd" id staan en toont de planning "Onbekend personeelslid"/"?"
// in plaats van gewoon te verdwijnen uit de toewijzing.
async function removeTeamMemberReferences(supabase: ReturnType<typeof createClient>, id: string) {
  const [{ data: phases }, { data: tasks }, { data: jobs }] = await Promise.all([
    supabase.from("schedule_phases").select("id,assignee_team_member_ids").contains("assignee_team_member_ids", [id]),
    supabase.from("tasks").select("id,assignee_team_member_ids").contains("assignee_team_member_ids", [id]),
    supabase.from("quick_jobs").select("id,assignee_team_member_ids,day_assignments").contains("assignee_team_member_ids", [id]),
  ]);

  await Promise.all(
    (phases ?? []).map((p) =>
      supabase
        .from("schedule_phases")
        .update({ assignee_team_member_ids: (p.assignee_team_member_ids as string[]).filter((x) => x !== id) })
        .eq("id", p.id)
    )
  );
  await Promise.all(
    (tasks ?? []).map((t) =>
      supabase
        .from("tasks")
        .update({ assignee_team_member_ids: (t.assignee_team_member_ids as string[]).filter((x) => x !== id) })
        .eq("id", t.id)
    )
  );
  await Promise.all(
    (jobs ?? []).map((j) => {
      const dayAssignments = j.day_assignments as QuickJobDayAssignment[] | null;
      return supabase
        .from("quick_jobs")
        .update({
          assignee_team_member_ids: (j.assignee_team_member_ids as string[]).filter((x) => x !== id),
          day_assignments: dayAssignments
            ? dayAssignments.map((d) => ({ ...d, team_member_ids: d.team_member_ids.filter((x) => x !== id) }))
            : null,
        })
        .eq("id", j.id);
    })
  );
}

export async function removeTeamMember(id: string) {
  await requireOwner();
  const supabase = createClient();
  const admin = createAdminClient();

  await removeTeamMemberReferences(supabase, id);

  const { data: profiles } = await supabase.from("profiles").select("id").eq("team_member_id", id);
  for (const p of profiles ?? []) {
    const { error: deleteUserError } = await admin.auth.admin.deleteUser(p.id);
    if (deleteUserError) throw new Error(deleteUserError.message);
  }
  const { error } = await supabase.from("team_members").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/personeel");
  revalidatePath("/planning-overzicht");
  revalidatePath("/dashboard");
  revalidatePath("/projects", "layout");
}
