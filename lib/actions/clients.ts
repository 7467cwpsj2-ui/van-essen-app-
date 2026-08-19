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

export async function updateClientDetails(id: string, patch: { name?: string }) {
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

// Een project kan aan meerdere klanten gekoppeld zijn: de primaire klant
// staat op projects.client_id (bepaalt o.a. de klantnaam op het dossier
// en projectkaarten), extra klanten krijgen evenveel toegang via
// project_client_access. Aanvinken koppelt deze klant zonder een
// eventuele andere klant te ontkoppelen; uitvinken ontkoppelt alleen
// deze klant.
export async function setClientProject(clientId: string, projectId: string, granted: boolean) {
  await requireOwner();
  const supabase = createClient();
  if (granted) {
    const { data: project } = await supabase.from("projects").select("client_id").eq("id", projectId).single();
    if (!project?.client_id) {
      const { error } = await supabase.from("projects").update({ client_id: clientId }).eq("id", projectId);
      if (error) throw new Error(error.message);
    } else if (project.client_id !== clientId) {
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
