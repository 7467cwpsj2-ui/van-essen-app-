"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getOwnerUserIds, getTeamMemberUserIds, sendPushToUsers } from "@/lib/push";

function truncate(text: string, max = 120) {
  return text.length > max ? text.slice(0, max - 1) + "…" : text;
}

export async function sendDirectMessage(
  teamMemberId: string,
  text: string,
  file?: { path: string; type: "image" | "pdf" } | null
) {
  const current = await requireUser();
  const trimmed = text.trim();
  if (!trimmed && !file) return;
  const isOwner = current.profile.role === "eigenaar";
  const supabase = createClient();
  const { error } = await supabase.from("direct_messages").insert({
    team_member_id: teamMemberId,
    author_id: current.id,
    author_name: current.profile.name,
    text: trimmed,
    file_path: file?.path ?? null,
    file_type: file?.type ?? null,
    read_by_owner: isOwner,
    read_by_member: !isOwner,
  });
  if (error) throw new Error(error.message);
  revalidatePath(`/berichten/${teamMemberId}`);
  revalidatePath("/berichten");

  const recipients = isOwner ? await getTeamMemberUserIds(teamMemberId, current.id) : await getOwnerUserIds(current.id);
  if (recipients.length) {
    await sendPushToUsers(recipients, {
      title: current.profile.name,
      body: trimmed ? truncate(trimmed) : file?.type === "image" ? "📷 Foto" : "📄 Bestand",
      url: `/berichten/${teamMemberId}`,
    });
  }
}

export async function deleteDirectMessage(teamMemberId: string, id: string) {
  await requireUser();
  const supabase = createClient();
  const { error } = await supabase.from("direct_messages").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath(`/berichten/${teamMemberId}`);
  revalidatePath("/berichten");
}

export async function markDirectMessagesRead(teamMemberId: string) {
  const current = await requireUser();
  const isOwner = current.profile.role === "eigenaar";
  const supabase = createClient();
  const { error } = await supabase
    .from("direct_messages")
    .update(isOwner ? { read_by_owner: true } : { read_by_member: true })
    .eq("team_member_id", teamMemberId)
    .eq(isOwner ? "read_by_owner" : "read_by_member", false);
  if (error) throw new Error(error.message);
  revalidatePath("/berichten");
}
