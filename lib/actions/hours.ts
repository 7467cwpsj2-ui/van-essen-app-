"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { weekdaysOfWeek } from "@/lib/workingDays";

// Uren horen bij precies één van de twee: een echt project, of een
// kleine klus (quick_jobs) — nooit allebei, nooit geen van beide.
export type HoursTarget = { projectId: string; quickJobId?: undefined } | { projectId?: undefined; quickJobId: string };

function revalidateTarget(target: HoursTarget) {
  if (target.projectId) {
    revalidatePath(`/projects/${target.projectId}/uren`);
    revalidatePath(`/projects/${target.projectId}/nacalculatie`);
  }
  revalidatePath("/uren");
  revalidatePath("/planning-overzicht");
}

export async function createHourEntry(
  target: HoursTarget,
  data: { teamMemberId: string; workDate: string; hours: number; note: string | null }
) {
  await requireUser();
  if (!data.teamMemberId || !data.workDate || !(data.hours > 0)) throw new Error("Datum en uren zijn verplicht.");
  const supabase = createClient();
  const { error } = await supabase.from("hours").insert({
    project_id: target.projectId ?? null,
    quick_job_id: target.quickJobId ?? null,
    team_member_id: data.teamMemberId,
    work_date: data.workDate,
    hours: data.hours,
    note: data.note || null,
  });
  if (error) throw new Error(error.message);
  revalidateTarget(target);
}

export async function createWeekHourEntries(
  target: HoursTarget,
  data: { teamMemberId: string; weekDate: string; hoursPerDay: number; note: string | null }
) {
  await requireUser();
  if (!data.teamMemberId || !data.weekDate || !(data.hoursPerDay > 0)) throw new Error("Team lid, week en uren zijn verplicht.");
  const supabase = createClient();
  const rows = weekdaysOfWeek(data.weekDate).map((workDate) => ({
    project_id: target.projectId ?? null,
    quick_job_id: target.quickJobId ?? null,
    team_member_id: data.teamMemberId,
    work_date: workDate,
    hours: data.hoursPerDay,
    note: data.note || null,
  }));
  const { error } = await supabase.from("hours").insert(rows);
  if (error) throw new Error(error.message);
  revalidateTarget(target);
}

export async function deleteHourEntry(target: HoursTarget, id: string) {
  await requireUser();
  const supabase = createClient();
  const { error } = await supabase.from("hours").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidateTarget(target);
}
