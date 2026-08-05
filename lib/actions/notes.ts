"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { NoteVisibility } from "@/types/database";

export async function createNote(projectId: string, text: string, visibility: NoteVisibility) {
  const current = await requireUser();
  if (!text.trim()) throw new Error("Tekst is verplicht.");
  const supabase = createClient();
  const { error } = await supabase.from("notes").insert({
    project_id: projectId,
    text: text.trim(),
    author_id: current.id,
    author_name: current.profile.name,
    visibility,
  });
  if (error) throw new Error(error.message);
  revalidatePath(`/projects/${projectId}/notities`);
}

export async function setNoteVisibility(projectId: string, id: string, visibility: NoteVisibility) {
  await requireUser();
  const supabase = createClient();
  const { error } = await supabase.from("notes").update({ visibility }).eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath(`/projects/${projectId}/notities`);
}

export async function deleteNote(projectId: string, id: string) {
  await requireUser();
  const supabase = createClient();
  const { error } = await supabase.from("notes").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath(`/projects/${projectId}/notities`);
}
