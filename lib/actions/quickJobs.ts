"use server";

import { revalidatePath } from "next/cache";
import { requireOwner } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
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
  });
  if (error) throw new Error(error.message);
  revalidatePath("/planning-overzicht");
}

export async function updateQuickJob(
  id: string,
  data: {
    title: string;
    assignee: string | null;
    assigneeTeamMemberIds: string[];
    start: string;
    end: string;
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
    })
    .eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/planning-overzicht");
}

export async function toggleQuickJobDone(id: string, done: boolean) {
  await requireOwner();
  const supabase = createClient();
  const { error } = await supabase.from("quick_jobs").update({ done }).eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/planning-overzicht");
}

export async function deleteQuickJob(id: string) {
  await requireOwner();
  const supabase = createClient();
  const { error } = await supabase.from("quick_jobs").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/planning-overzicht");
}
