"use server";

import { revalidatePath } from "next/cache";
import { requireOwner } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { permissionsFromFormData } from "@/lib/permissionsFromFormData";
import { defaultPermissions, type ModuleKey } from "@/types/database";

export async function inviteClient(formData: FormData) {
  await requireOwner();
  const name = String(formData.get("name") || "").trim();
  const email = String(formData.get("email") || "").trim();
  if (!name || !email) throw new Error("Naam en e-mailadres zijn verplicht.");

  const supabase = createClient();
  const { data: client, error: clientError } = await supabase
    .from("clients")
    .insert({ name, permissions: permissionsFromFormData(formData) })
    .select()
    .single();
  if (clientError || !client) throw new Error(clientError?.message || "Kon klant niet aanmaken.");

  const admin = createAdminClient();
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
  const { data: invited, error: inviteError } = await admin.auth.admin.inviteUserByEmail(email, {
    redirectTo: `${siteUrl}/auth/callback?next=${encodeURIComponent("/account/wachtwoord?onboarding=1")}`,
  });

  if (inviteError || !invited?.user) {
    await supabase.from("clients").delete().eq("id", client.id);
    throw new Error(inviteError?.message || "Uitnodigen mislukt.");
  }

  const { error: profileError } = await admin
    .from("profiles")
    .insert({ id: invited.user.id, role: "klant", name, client_id: client.id });

  if (profileError) {
    await admin.auth.admin.deleteUser(invited.user.id);
    await supabase.from("clients").delete().eq("id", client.id);
    throw new Error(profileError.message);
  }

  revalidatePath("/clients");
}

// Opnieuw uitnodigen als de vorige link is verlopen — zonder de klant en
// diens rechten/projectkoppelingen te hoeven verwijderen en opnieuw aan
// te maken. generateLink (i.p.v. inviteUserByEmail) werkt ook voor een
// account dat al bestaat maar de uitnodiging nog niet heeft geaccepteerd,
// en geeft de link direct terug zodat je 'm ook handmatig kunt delen als
// de uitnodigingsmail zelf niet aankomt.
export async function resendClientInvite(clientId: string): Promise<string> {
  await requireOwner();
  const supabase = createClient();
  const admin = createAdminClient();
  const { data: profile } = await supabase.from("profiles").select("id").eq("client_id", clientId).maybeSingle();
  if (!profile) throw new Error("Geen account gekoppeld aan deze klant.");
  const { data: userData, error: userError } = await admin.auth.admin.getUserById(profile.id);
  const email = userData?.user?.email;
  if (userError || !email) throw new Error(userError?.message || "Kon het e-mailadres niet vinden.");

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
  const { data: link, error } = await admin.auth.admin.generateLink({
    type: "invite",
    email,
    options: { redirectTo: `${siteUrl}/auth/callback?next=${encodeURIComponent("/account/wachtwoord?onboarding=1")}` },
  });
  if (error || !link?.properties?.action_link) throw new Error(error?.message || "Opnieuw uitnodigen mislukt.");
  revalidatePath("/clients");
  return link.properties.action_link;
}

export async function updateClientDetails(id: string, patch: { name?: string; color?: string | null }) {
  await requireOwner();
  const supabase = createClient();
  const { error } = await supabase.from("clients").update(patch).eq("id", id);
  if (error) throw new Error(error.message);
  if (patch.name) {
    await supabase.from("profiles").update({ name: patch.name }).eq("client_id", id);
  }
  revalidatePath("/clients");
}

export async function toggleClientModulePermission(id: string, moduleKey: ModuleKey, value: boolean) {
  await requireOwner();
  const supabase = createClient();
  const { data: client } = await supabase.from("clients").select("permissions").eq("id", id).single();
  const permissions = { ...(client?.permissions ?? defaultPermissions()), [moduleKey]: value };
  const { error } = await supabase.from("clients").update({ permissions }).eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/clients");
}

export async function toggleClientCanEditSchedule(id: string, value: boolean) {
  await requireOwner();
  const supabase = createClient();
  const { error } = await supabase.from("clients").update({ can_edit_schedule: value }).eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/clients");
}

// Een project kan aan maximaal 2 klanten gekoppeld zijn: de primaire
// klant staat op projects.client_id (bepaalt o.a. de klantnaam op het
// dossier en projectkaarten), een eventuele tweede klant krijgt evenveel
// toegang via project_client_access. Aanvinken koppelt deze klant zonder
// een eventuele andere klant te ontkoppelen; uitvinken ontkoppelt alleen
// deze klant. De harde limiet van 2 zit ook als veiligheidsnet in de
// database (zie migratie 0042).
export async function setClientProject(clientId: string, projectId: string, granted: boolean) {
  await requireOwner();
  const supabase = createClient();
  if (granted) {
    const { data: project } = await supabase.from("projects").select("client_id").eq("id", projectId).single();
    if (!project?.client_id) {
      const { error } = await supabase.from("projects").update({ client_id: clientId }).eq("id", projectId);
      if (error) throw new Error(error.message);
    } else if (project.client_id !== clientId) {
      const { count } = await supabase
        .from("project_client_access")
        .select("client_id", { count: "exact", head: true })
        .eq("project_id", projectId);
      if ((count ?? 0) >= 1) {
        throw new Error("Een project kan aan maximaal 2 klanten gekoppeld worden.");
      }
      const { error } = await supabase.from("project_client_access").insert({ project_id: projectId, client_id: clientId });
      if (error) throw new Error(error.message);
    }
  } else {
    const { error: accessError } = await supabase
      .from("project_client_access")
      .delete()
      .eq("project_id", projectId)
      .eq("client_id", clientId);
    if (accessError) throw new Error(accessError.message);
    const { error } = await supabase.from("projects").update({ client_id: null }).eq("id", projectId).eq("client_id", clientId);
    if (error) throw new Error(error.message);
  }
  revalidatePath("/clients");
  revalidatePath("/dashboard");
  revalidatePath(`/projects/${projectId}`);
}

export async function removeClient(id: string) {
  await requireOwner();
  const supabase = createClient();
  const admin = createAdminClient();

  const { data: profiles } = await supabase.from("profiles").select("id").eq("client_id", id);
  for (const p of profiles ?? []) {
    const { error: deleteUserError } = await admin.auth.admin.deleteUser(p.id);
    if (deleteUserError) throw new Error(deleteUserError.message);
  }
  const { error } = await supabase.from("clients").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/clients");
}
