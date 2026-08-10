"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireOwner } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { ProjectStatus } from "@/types/database";

const STORAGE_FOLDERS = ["drawings", "photos", "signatures", "delivery", "cover"];

export async function createProject(formData: FormData) {
  const current = await requireOwner();
  const name = String(formData.get("name") || "").trim();
  const address = String(formData.get("address") || "").trim() || null;
  const clientId = String(formData.get("client_id") || "").trim() || null;
  if (!name) throw new Error("Projectnaam is verplicht.");

  const supabase = createClient();
  const { data, error } = await supabase
    .from("projects")
    .insert({ name, address, client_id: clientId, created_by: current.id })
    .select()
    .single();
  if (error || !data) throw new Error(error?.message || "Kon project niet aanmaken.");

  revalidatePath("/dashboard");
  redirect(`/projects/${data.id}/planning`);
}

export async function updateProjectStatus(id: string, status: ProjectStatus) {
  await requireOwner();
  const supabase = createClient();
  const { error } = await supabase.from("projects").update({ status }).eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath(`/projects/${id}`);
  revalidatePath("/dashboard");
}

export async function updateProjectDetails(id: string, data: { name: string; address: string | null }) {
  await requireOwner();
  const name = data.name.trim();
  if (!name) throw new Error("Projectnaam is verplicht.");
  const supabase = createClient();
  const { error } = await supabase.from("projects").update({ name, address: data.address?.trim() || null }).eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath(`/projects/${id}`);
  revalidatePath("/dashboard");
}

export async function setCoverPhoto(id: string, filePath: string) {
  await requireOwner();
  const supabase = createClient();
  const { data: project } = await supabase.from("projects").select("cover_photo_path").eq("id", id).single();
  const oldPath = project?.cover_photo_path as string | null | undefined;

  const { error } = await supabase.from("projects").update({ cover_photo_path: filePath }).eq("id", id);
  if (error) throw new Error(error.message);

  if (oldPath && oldPath !== filePath) {
    const admin = createAdminClient();
    await admin.storage.from("project-files").remove([oldPath]);
  }

  revalidatePath(`/projects/${id}`);
  revalidatePath("/dashboard");
}

export async function removeCoverPhoto(id: string) {
  await requireOwner();
  const supabase = createClient();
  const { data: project } = await supabase.from("projects").select("cover_photo_path").eq("id", id).single();
  const oldPath = project?.cover_photo_path as string | null | undefined;
  if (!oldPath) return;

  const { error } = await supabase.from("projects").update({ cover_photo_path: null }).eq("id", id);
  if (error) throw new Error(error.message);

  const admin = createAdminClient();
  await admin.storage.from("project-files").remove([oldPath]);

  revalidatePath(`/projects/${id}`);
  revalidatePath("/dashboard");
}

export async function deleteProject(id: string) {
  await requireOwner();
  const supabase = createClient();
  const { data: project, error: fetchError } = await supabase
    .from("projects")
    .select("delivery_signed_at")
    .eq("id", id)
    .single();
  if (fetchError || !project) throw new Error("Project niet gevonden.");
  if (project.delivery_signed_at) throw new Error("Een ondertekend, vergrendeld project kan niet verwijderd worden.");

  const admin = createAdminClient();
  const paths: string[] = [];
  for (const folder of STORAGE_FOLDERS) {
    const { data: files } = await admin.storage.from("project-files").list(`${id}/${folder}`);
    (files ?? []).forEach((f) => paths.push(`${id}/${folder}/${f.name}`));
  }
  if (paths.length) await admin.storage.from("project-files").remove(paths);

  const { error } = await supabase.from("projects").delete().eq("id", id);
  if (error) throw new Error(error.message);

  revalidatePath("/dashboard");
  redirect("/dashboard");
}
