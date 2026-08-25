"use server";

import { revalidatePath } from "next/cache";
import { requireOwner } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { workingDaysBetween } from "@/lib/workingDays";
import type { QuickJobDayAssignment } from "@/types/database";

// Bij een klus van een paar dagen kan de bezetting per dag verschillen
// (dag 1 met twee man, dag 2 met één) — dayAssignments is dan leidend.
// assignee_team_member_ids/assignee blijven wel gevuld (als samenvatting
// van iedereen die op enig moment meewerkt), zodat de bestaande filters
// en de "wie werkt hieraan"-tekst gewoon blijven werken.
function summarize(dayAssignments: QuickJobDayAssignment[] | null, fallbackIds: string[]) {
  if (!dayAssignments || dayAssignments.length === 0) return fallbackIds;
  const ids = new Set<string>();
  for (const d of dayAssignments) for (const id of d.team_member_ids) ids.add(id);
  return Array.from(ids);
}

export async function createQuickJob(data: {
  title: string;
  assignee: string | null;
  assigneeTeamMemberIds: string[];
  start: string;
  end: string;
  address?: string | null;
  description?: string | null;
  dayAssignments?: QuickJobDayAssignment[] | null;
}) {
  await requireOwner();
  if (!data.title.trim() || !data.start || !data.end) throw new Error("Titel, startdatum en einddatum zijn verplicht.");
  const dayAssignments = data.dayAssignments && data.dayAssignments.length > 0 ? data.dayAssignments : null;
  const memberIds = summarize(dayAssignments, data.assigneeTeamMemberIds);
  const supabase = createClient();
  const { error } = await supabase.from("quick_jobs").insert({
    title: data.title.trim(),
    assignee: memberIds.length > 0 ? null : data.assignee || null,
    assignee_team_member_ids: memberIds,
    start_date: data.start,
    end_date: data.end,
    day_assignments: dayAssignments,
    address: data.address?.trim() || null,
    description: data.description?.trim() || null,
  });
  if (error) throw new Error(error.message);
  revalidatePath("/planning-overzicht");
  revalidatePath("/dashboard");
}

export async function updateQuickJob(
  id: string,
  data: {
    title: string;
    assignee: string | null;
    assigneeTeamMemberIds: string[];
    start: string;
    end: string;
    address?: string | null;
    description?: string | null;
    dayAssignments?: QuickJobDayAssignment[] | null;
  }
) {
  await requireOwner();
  if (!data.title.trim() || !data.start || !data.end) throw new Error("Titel, startdatum en einddatum zijn verplicht.");
  const dayAssignments = data.dayAssignments && data.dayAssignments.length > 0 ? data.dayAssignments : null;
  const memberIds = summarize(dayAssignments, data.assigneeTeamMemberIds);
  const supabase = createClient();
  const { error } = await supabase
    .from("quick_jobs")
    .update({
      title: data.title.trim(),
      assignee: memberIds.length > 0 ? null : data.assignee || null,
      assignee_team_member_ids: memberIds,
      start_date: data.start,
      end_date: data.end,
      day_assignments: dayAssignments,
      address: data.address?.trim() || null,
      description: data.description?.trim() || null,
    })
    .eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/planning-overzicht");
  revalidatePath("/dashboard");
  revalidatePath(`/klussen/${id}`);
}

export async function updateQuickJobColor(id: string, color: string) {
  await requireOwner();
  if (!/^#[0-9a-fA-F]{6}$/.test(color)) throw new Error("Ongeldige kleur.");
  const supabase = createClient();
  const { error } = await supabase.from("quick_jobs").update({ color }).eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/planning-overzicht");
}

// Alleen de bezetting van één specifieke dag aanpassen — bijv. vanuit
// het "vakje" in de algemene planning. Had de klus nog geen dag-voor-
// dag verdeling, dan wordt die hier alsnog aangemaakt (elke werkdag
// krijgt eerst de bestaande vaste bezetting, daarna wordt alleen de
// opgegeven dag overschreven) zodat de andere dagen niet veranderen.
export async function updateQuickJobDayAssignment(id: string, date: string, teamMemberIds: string[]) {
  await requireOwner();
  const supabase = createClient();
  const { data: job, error: fetchError } = await supabase
    .from("quick_jobs")
    .select("start_date,end_date,day_assignments,assignee_team_member_ids,assignee")
    .eq("id", id)
    .single();
  if (fetchError || !job) throw new Error(fetchError?.message || "Klus niet gevonden.");

  const workDays = workingDaysBetween(job.start_date as string, job.end_date as string);
  const existing = (job.day_assignments as QuickJobDayAssignment[] | null) ?? [];
  const existingByDate = new Map(existing.map((d) => [d.date, d.team_member_ids]));
  const dayAssignments: QuickJobDayAssignment[] = workDays.map((d) => ({
    date: d,
    team_member_ids: d === date ? teamMemberIds : existingByDate.get(d) ?? (job.assignee_team_member_ids as string[]),
  }));
  const memberIds = summarize(dayAssignments, job.assignee_team_member_ids as string[]);

  const { error } = await supabase
    .from("quick_jobs")
    .update({
      day_assignments: dayAssignments,
      assignee_team_member_ids: memberIds,
      assignee: memberIds.length > 0 ? null : (job.assignee as string | null),
    })
    .eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/planning-overzicht");
  revalidatePath(`/klussen/${id}`);
}

export async function toggleQuickJobDone(id: string, done: boolean) {
  await requireOwner();
  const supabase = createClient();
  const { error } = await supabase.from("quick_jobs").update({ done }).eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/planning-overzicht");
  revalidatePath(`/klussen/${id}`);
}

export async function deleteQuickJob(id: string) {
  await requireOwner();
  const supabase = createClient();
  const { error } = await supabase.from("quick_jobs").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/planning-overzicht");
  revalidatePath("/dashboard");
}
