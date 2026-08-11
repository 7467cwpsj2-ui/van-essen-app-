"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getOwnerUserIds, getProjectClientUserIds, getProjectName, getProjectParticipantUserIds, sendPushToUsers } from "@/lib/push";

function truncate(text: string, max = 120) {
  return text.length > max ? text.slice(0, max - 1) + "…" : text;
}

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

  const recipients = await getProjectParticipantUserIds(projectId, current.id);
  if (recipients.length) {
    const projectName = await getProjectName(projectId);
    await sendPushToUsers(recipients, {
      title: `${current.profile.name} — ${projectName}`,
      body: truncate(text.trim()),
      url: `/projects/${projectId}/chat`,
    });
  }
}

export async function deleteChatMessage(projectId: string, id: string) {
  await requireUser();
  const supabase = createClient();
  const { error } = await supabase.from("chat_messages").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath(`/projects/${projectId}/chat`);
}

export async function sendPrivateMessage(
  projectId: string,
  text: string,
  file?: { path: string; type: "image" | "pdf" } | null
) {
  const current = await requireUser();
  const trimmed = text.trim();
  if (!trimmed && !file) return;
  const supabase = createClient();
  const { error } = await supabase.from("owner_client_messages").insert({
    project_id: projectId,
    author_id: current.id,
    author_name: current.profile.name,
    text: trimmed,
    file_path: file?.path ?? null,
    file_type: file?.type ?? null,
  });
  if (error) throw new Error(error.message);
  revalidatePath(`/projects/${projectId}/privechat`);

  const recipients =
    current.profile.role === "eigenaar"
      ? await getProjectClientUserIds(projectId, current.id)
      : await getOwnerUserIds(current.id);
  if (recipients.length) {
    const projectName = await getProjectName(projectId);
    await sendPushToUsers(recipients, {
      title: `${current.profile.name} — ${projectName}`,
      body: trimmed ? truncate(trimmed) : file?.type === "image" ? "📷 Foto" : "📄 Bestand",
      url: `/projects/${projectId}/privechat`,
    });
  }
}

export async function deletePrivateMessage(projectId: string, id: string) {
  await requireUser();
  const supabase = createClient();
  const { error } = await supabase.from("owner_client_messages").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath(`/projects/${projectId}/privechat`);
}
