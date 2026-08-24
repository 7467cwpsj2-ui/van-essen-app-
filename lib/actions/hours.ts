"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { weekdaysOfWeek } from "@/lib/workingDays";

export async function createHourEntry(
  projectId: string,
  data: { teamMemberId: string; workDate: string; hours: number; note: string | null }
) {
  await requireUser();
  if (!data.teamMemberId || !data.workDate || !(data.hours > 0)) throw new Error("Datum en uren zijn verplicht.");
  const supabase = createClient();
  const { error } = await supabase.from("hours").insert({
    project_id: projectId,
    team_member_id: data.teamMemberId,
    work_date: data.workDate,
    hours: data.hours,
    note: data.note || null,
  });
  if (error) throw new Error(error.message);
  revalidatePath(`/projects/${projectId}/uren`);
  revalidatePath("/uren");
}

export async function createWeekHourEntries(
  projectId: string,
  data: { teamMemberId: string; weekDate: string; hoursPerDay: number; note: string | null }
) {
  await requireUser();
  if (!data.teamMemberId || !data.weekDate || !(data.hoursPerDay > 0)) throw new Error("Team lid, week en uren zijn verplicht.");
  const supabase = createClient();
  const rows = weekdaysOfWeek(data.weekDate).map((workDate) => ({
    project_id: projectId,
    team_member_id: data.teamMemberId,
    work_date: workDate,
    hours: data.hoursPerDay,
    note: data.note || null,
  }));
  const { error } = await supabase.from("hours").insert(rows);
  if (error) throw new Error(error.message);
  revalidatePath(`/projects/${projectId}/uren`);
  revalidatePath("/uren");
}

export async function deleteHourEntry(projectId: string, id: string) {
  await requireUser();
  const supabase = createClient();
  const { error } = await supabase.from("hours").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath(`/projects/${projectId}/uren`);
  revalidatePath("/uren");
}
