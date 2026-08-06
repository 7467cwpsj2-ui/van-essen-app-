"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { ExtraWorkType } from "@/types/database";

export async function createExtraWork(
  projectId: string,
  data: {
    type: ExtraWorkType;
    description: string;
    amount: number;
    explanation: string | null;
    extraDays: number | null;
    phaseId: string | null;
  }
) {
  await requireUser();
  if (!data.description.trim() || !(data.amount >= 0)) throw new Error("Omschrijving en bedrag zijn verplicht.");

  const supabase = createClient();
  const days = data.extraDays && data.extraDays > 0 ? data.extraDays : 0;
  const signedDays = days ? (data.type === "minderwerk" ? -days : days) : 0;

  let scheduleCutoff: string | null = null;
  if (signedDays !== 0 && data.phaseId) {
    const { data: phase } = await supabase.from("schedule_phases").select("end_date").eq("id", data.phaseId).single();
    scheduleCutoff = phase?.end_date ?? null;
    if (!scheduleCutoff) throw new Error("Kies bij welke fase deze dagen horen.");
  }

  const { error } = await supabase.from("extra_work").insert({
    project_id: projectId,
    type: data.type,
    description: data.description.trim(),
    amount: data.amount,
    explanation: data.explanation?.trim() || null,
    extra_days: signedDays !== 0 ? signedDays : null,
    phase_id: signedDays !== 0 ? data.phaseId : null,
    schedule_cutoff: scheduleCutoff,
  });
  if (error) throw new Error(error.message);
  revalidatePath(`/projects/${projectId}/meerwerk`);
}

export async function approveExtraWork(projectId: string, workId: string, signaturePath: string | null) {
  await requireUser();
  const supabase = createClient();
  const { error } = await supabase.rpc("approve_extra_work", { p_work_id: workId, p_signature_path: signaturePath });
  if (error) throw new Error(error.message);
  revalidatePath(`/projects/${projectId}/meerwerk`);
  revalidatePath(`/projects/${projectId}/bouwplanning`);
}

export async function rejectExtraWork(projectId: string, workId: string) {
  await requireUser();
  const supabase = createClient();
  const { error } = await supabase.rpc("reject_extra_work", { p_work_id: workId });
  if (error) throw new Error(error.message);
  revalidatePath(`/projects/${projectId}/meerwerk`);
  revalidatePath(`/projects/${projectId}/bouwplanning`);
}

export async function resetExtraWork(projectId: string, workId: string) {
  await requireUser();
  const supabase = createClient();
  const { error } = await supabase.rpc("reset_extra_work", { p_work_id: workId });
  if (error) throw new Error(error.message);
  revalidatePath(`/projects/${projectId}/meerwerk`);
  revalidatePath(`/projects/${projectId}/bouwplanning`);
}

export async function deleteExtraWork(projectId: string, workId: string) {
  await requireUser();
  const supabase = createClient();
  const { error } = await supabase.from("extra_work").delete().eq("id", workId);
  if (error) throw new Error(error.message);
  revalidatePath(`/projects/${projectId}/meerwerk`);
}
