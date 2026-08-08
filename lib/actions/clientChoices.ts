"use server";

import { revalidatePath } from "next/cache";
import { requireOwner, requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getOwnerUserIds, getProjectClientUserIds, getProjectName, sendPushToUsers } from "@/lib/push";

export async function createClientChoice(
  projectId: string,
  data: { category: string; description: string | null; deadline: string | null }
) {
  const current = await requireOwner();
  if (!data.category.trim()) throw new Error("Categorie is verplicht.");
  const supabase = createClient();
  const { error } = await supabase.from("client_choices").insert({
    project_id: projectId,
    category: data.category.trim(),
    description: data.description || null,
    deadline: data.deadline || null,
  });
  if (error) throw new Error(error.message);
  revalidatePath(`/projects/${projectId}/klantkeuzes`);

  const recipients = await getProjectClientUserIds(projectId, current.id);
  if (recipients.length) {
    const projectName = await getProjectName(projectId);
    await sendPushToUsers(recipients, {
      title: `Nieuwe klantkeuze — ${projectName}`,
      body: data.category.trim(),
      url: `/projects/${projectId}/klantkeuzes`,
    });
  }
}

export async function decideClientChoice(projectId: string, id: string, status: "gekozen" | "afgewezen", choiceText: string | null) {
  const current = await requireUser();
  const supabase = createClient();
  const { error } = await supabase.rpc("decide_client_choice", { p_id: id, p_status: status, p_choice_text: choiceText });
  if (error) throw new Error(error.message);
  revalidatePath(`/projects/${projectId}/klantkeuzes`);

  const recipients = await getOwnerUserIds(current.id);
  if (recipients.length) {
    const projectName = await getProjectName(projectId);
    await sendPushToUsers(recipients, {
      title: `Klantkeuze beantwoord — ${projectName}`,
      body: status === "gekozen" ? "De klant heeft een keuze gemaakt." : "De klant heeft een keuze afgewezen.",
      url: `/projects/${projectId}/klantkeuzes`,
    });
  }
}

export async function resetClientChoice(projectId: string, id: string) {
  await requireOwner();
  const supabase = createClient();
  const { error } = await supabase.rpc("reset_client_choice", { p_id: id });
  if (error) throw new Error(error.message);
  revalidatePath(`/projects/${projectId}/klantkeuzes`);
}

export async function deleteClientChoice(projectId: string, id: string) {
  await requireOwner();
  const supabase = createClient();
  const { error } = await supabase.from("client_choices").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath(`/projects/${projectId}/klantkeuzes`);
}
