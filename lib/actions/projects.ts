"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireOwner } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { ProjectStatus } from "@/types/database";

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
