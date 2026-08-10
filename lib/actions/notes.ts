"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getOwnerUserIds, getProjectClientUserIds, getProjectInternalUserIds, getProjectName, getTeamMemberUserIds, sendPushToUsers } from "@/lib/push";
import type { NoteVisibility } from "@/types/database";

function truncate(text: string, max = 120) {
  return text.length > max ? text.slice(0, max - 1) + "…" : text;
}

export async function createNote(
  projectId: string,
  text: string,
  visibility: NoteVisibility,
  visibleTeamMemberIds: string[] = []
) {
  const current = await requireUser();
  if (!text.trim()) throw new Error("Tekst is verplicht.");
  const supabase = createClient();
  const { error } = await supabase.from("notes").insert({
    project_id: projectId,
    text: text.trim(),
    author_id: current.id,
    author_name: current.profile.name,
    visibility,
    visible_team_member_ids: visibility === "team" ? visibleTeamMemberIds : [],
  });
  if (error) throw new Error(error.message);
  revalidatePath(`/projects/${projectId}/notities`);

  let recipients: string[] = [];
  if (current.profile.role !== "eigenaar") {
    // Niet-eigenaar-notities gaan altijd eerst langs de eigenaar ter beoordeling.
    recipients = await getOwnerUserIds(current.id);
  } else if (visibility === "team") {
    if (visibleTeamMemberIds.length > 0) {
      const lists = await Promise.all(visibleTeamMemberIds.map((id) => getTeamMemberUserIds(id, current.id)));
      recipients = Array.from(new Set(lists.flat()));
    } else {
      recipients = await getProjectInternalUserIds(projectId, current.id);
    }
  } else if (visibility === "klant") {
    const [internal, clients] = await Promise.all([
      getProjectInternalUserIds(projectId, current.id),
      getProjectClientUserIds(projectId, current.id),
    ]);
    recipients = Array.from(new Set([...internal, ...clients]));
  } else if (visibility === "alleen_klant") {
    recipients = await getProjectClientUserIds(projectId, current.id);
  }
  if (recipients.length) {
    const projectName = await getProjectName(projectId);
    await sendPushToUsers(recipients, {
      title: `Nieuwe notitie — ${projectName}`,
      body: truncate(text.trim()),
      url: `/projects/${projectId}/notities`,
    });
  }
}

export async function updateNoteText(projectId: string, id: string, text: string) {
  await requireUser();
  if (!text.trim()) throw new Error("Tekst is verplicht.");
  const supabase = createClient();
  const { error } = await supabase.from("notes").update({ text: text.trim() }).eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath(`/projects/${projectId}/notities`);
}

export async function setNoteVisibility(projectId: string, id: string, visibility: NoteVisibility) {
  const current = await requireUser();
  const supabase = createClient();
  const { error } = await supabase.from("notes").update({ visibility, reviewed: true }).eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath(`/projects/${projectId}/notities`);

  let recipients: string[] = [];
  if (visibility === "team") {
    recipients = await getProjectInternalUserIds(projectId, current.id);
  } else if (visibility === "klant") {
    const [internal, clients] = await Promise.all([
      getProjectInternalUserIds(projectId, current.id),
      getProjectClientUserIds(projectId, current.id),
    ]);
    recipients = Array.from(new Set([...internal, ...clients]));
  } else if (visibility === "alleen_klant") {
    recipients = await getProjectClientUserIds(projectId, current.id);
  }
  if (recipients.length) {
    const projectName = await getProjectName(projectId);
    await sendPushToUsers(recipients, {
      title: `Notitie gedeeld — ${projectName}`,
      body: "Er is een notitie met je gedeeld.",
      url: `/projects/${projectId}/notities`,
    });
  }
}

// Eigenaar besluit een notitie niet te delen — blijft op de huidige
// zichtbaarheid staan, verdwijnt alleen als "nog te beoordelen".
export async function markNoteReviewed(projectId: string, id: string) {
  await requireUser();
  const supabase = createClient();
  const { error } = await supabase.from("notes").update({ reviewed: true }).eq("id", id);
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
