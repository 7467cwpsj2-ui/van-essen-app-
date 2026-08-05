"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { FileType, PhotoCategory } from "@/types/database";

function defaultVisibility(role: string) {
  if (role === "eigenaar") return { team_visible: true, client_visible: false, reviewed: true };
  if (role === "team") return { team_visible: false, client_visible: false, reviewed: false };
  return { team_visible: false, client_visible: true, reviewed: false }; // klant
}

export async function createDrawing(
  projectId: string,
  data: { title: string; note: string | null; filePath: string; fileType: FileType; shareWithClient?: boolean }
) {
  const current = await requireUser();
  if (!data.title.trim()) throw new Error("Titel is verplicht.");
  const supabase = createClient();
  const vis = defaultVisibility(current.profile.role);
  if (current.profile.role === "eigenaar" && data.shareWithClient) vis.client_visible = true;

  const { error } = await supabase.from("drawings").insert({
    project_id: projectId,
    title: data.title.trim(),
    note: data.note || null,
    file_path: data.filePath,
    file_type: data.fileType,
    uploader_id: current.id,
    uploaded_by: current.profile.name,
    uploader_role: current.profile.role,
    ...vis,
  });
  if (error) throw new Error(error.message);
  revalidatePath(`/projects/${projectId}/tekeningen`);
}

export async function setDrawingVisibility(
  projectId: string,
  id: string,
  patch: { teamVisible: boolean; clientVisible: boolean; reviewed: boolean }
) {
  await requireUser();
  const supabase = createClient();
  const { error } = await supabase
    .from("drawings")
    .update({ team_visible: patch.teamVisible, client_visible: patch.clientVisible, reviewed: patch.reviewed })
    .eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath(`/projects/${projectId}/tekeningen`);
}

export async function deleteDrawing(projectId: string, id: string, filePath: string | null) {
  await requireUser();
  const supabase = createClient();
  const { error } = await supabase.from("drawings").delete().eq("id", id);
  if (error) throw new Error(error.message);
  if (filePath) await supabase.storage.from("project-files").remove([filePath]);
  revalidatePath(`/projects/${projectId}/tekeningen`);
}

export async function createPhoto(
  projectId: string,
  data: {
    title: string;
    category: PhotoCategory;
    note: string | null;
    filePath: string;
    fileType: FileType;
    shareWithClient?: boolean;
  }
) {
  const current = await requireUser();
  if (!data.title.trim()) throw new Error("Titel is verplicht.");
  const supabase = createClient();
  const vis = defaultVisibility(current.profile.role);
  if (current.profile.role === "eigenaar" && data.shareWithClient) vis.client_visible = true;

  const { error } = await supabase.from("photos").insert({
    project_id: projectId,
    title: data.title.trim(),
    category: data.category,
    note: data.note || null,
    file_path: data.filePath,
    file_type: data.fileType,
    uploader_id: current.id,
    uploaded_by: current.profile.name,
    uploader_role: current.profile.role,
    ...vis,
  });
  if (error) throw new Error(error.message);
  revalidatePath(`/projects/${projectId}/fotos`);
}

export async function setPhotoVisibility(
  projectId: string,
  id: string,
  patch: { teamVisible: boolean; clientVisible: boolean; reviewed: boolean }
) {
  await requireUser();
  const supabase = createClient();
  const { error } = await supabase
    .from("photos")
    .update({ team_visible: patch.teamVisible, client_visible: patch.clientVisible, reviewed: patch.reviewed })
    .eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath(`/projects/${projectId}/fotos`);
}

export async function deletePhoto(projectId: string, id: string, filePath: string | null) {
  await requireUser();
  const supabase = createClient();
  const { error } = await supabase.from("photos").delete().eq("id", id);
  if (error) throw new Error(error.message);
  if (filePath) await supabase.storage.from("project-files").remove([filePath]);
  revalidatePath(`/projects/${projectId}/fotos`);
}
