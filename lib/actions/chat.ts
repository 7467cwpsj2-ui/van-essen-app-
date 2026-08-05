"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export async function sendChatMessage(projectId: string, text: string) {
  const current = await requireUser();
  if (!text.trim()) return;
  const supabase = createClient();
  const { error } = await supabase.from("chat_messages").insert({
    project_id: projectId,
    author_id: current.id,
    author_name: current.profile.name,
    text: text.trim(),
  });
  if (error) throw new Error(error.message);
  revalidatePath(`/projects/${projectId}/chat`);
}

export async function deleteChatMessage(projectId: string, id: string) {
  await requireUser();
  const supabase = createClient();
  const { error } = await supabase.from("chat_messages").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath(`/projects/${projectId}/chat`);
}

export async function sendPrivateMessage(projectId: string, text: string) {
  const current = await requireUser();
  if (!text.trim()) return;
  const supabase = createClient();
  const { error } = await supabase.from("owner_client_messages").insert({
    project_id: projectId,
    author_id: current.id,
    author_name: current.profile.name,
    text: text.trim(),
  });
  if (error) throw new Error(error.message);
  revalidatePath(`/projects/${projectId}/privechat`);
}

export async function deletePrivateMessage(projectId: string, id: string) {
  await requireUser();
  const supabase = createClient();
  const { error } = await supabase.from("owner_client_messages").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath(`/projects/${projectId}/privechat`);
}
