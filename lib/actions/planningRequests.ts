"use server";

import { revalidatePath } from "next/cache";
import { requireOwner, requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { createQuickJob, deleteQuickJob, updateQuickJob, updateQuickJobDayAssignment } from "@/lib/actions/quickJobs";
import { getOwnerUserIds, sendPushToUsers } from "@/lib/push";
import type { DayPart, QuickJobDayAssignment } from "@/types/database";

interface CreatePayload {
  title: string;
  assignee: string | null;
  assigneeTeamMemberIds: string[];
  start: string;
  end: string;
  address?: string | null;
  description?: string | null;
  dayAssignments?: QuickJobDayAssignment[] | null;
  kind?: "klus" | "verlof";
  daypart?: DayPart;
}
type UpdatePayload = Omit<CreatePayload, "kind">;
interface DayAssignmentPayload {
  date: string;
  teamMemberIds: string[];
  daypart: DayPart;
}

// Alleen een teamlid met expliciete "wijzigen"-toegang mag een voorstel
// indienen — de database-RLS op planning_change_requests controleert
// dit nog een keer (has_planning_edit_access()), dit is puur voor een
// vriendelijke foutmelding i.p.v. een kale RLS-fout.
async function requireEditRequester() {
  const current = await requireUser();
  if (current.profile.role !== "team" || current.teamMember?.planning_overzicht_access !== "wijzigen") {
    throw new Error("Geen toegang om wijzigingen voor te stellen.");
  }
  return current;
}

async function notifyOwnerOfRequest(requesterName: string, summary: string) {
  const recipients = await getOwnerUserIds();
  if (recipients.length === 0) return;
  await sendPushToUsers(recipients, {
    title: "Wijziging planning ter goedkeuring",
    body: `${requesterName}: ${summary}`,
    url: "/planning-overzicht",
  });
}

async function insertRequest(
  current: Awaited<ReturnType<typeof requireEditRequester>>,
  action: "create" | "update" | "delete" | "day_assignment",
  quickJobId: string | null,
  summary: string,
  payload: unknown
) {
  const supabase = createClient();
  const { error } = await supabase.from("planning_change_requests").insert({
    requested_by: current.id,
    requested_by_name: current.profile.name,
    action,
    quick_job_id: quickJobId,
    summary,
    payload,
  });
  if (error) throw new Error(error.message);
  revalidatePath("/planning-overzicht");
  await notifyOwnerOfRequest(current.profile.name, summary);
}

export async function proposeCreateQuickJob(data: CreatePayload) {
  const current = await requireEditRequester();
  if (!data.title.trim() || !data.start || !data.end) throw new Error("Titel, startdatum en einddatum zijn verplicht.");
  const summary = `Nieuw voorstel: ${data.kind === "verlof" ? "vakantie" : "klus"} "${data.title.trim()}" (${data.start} t/m ${data.end})`;
  await insertRequest(current, "create", null, summary, data);
}

export async function proposeUpdateQuickJob(id: string, data: UpdatePayload) {
  const current = await requireEditRequester();
  if (!data.title.trim() || !data.start || !data.end) throw new Error("Titel, startdatum en einddatum zijn verplicht.");
  const summary = `Wijzigingsvoorstel: "${data.title.trim()}" (${data.start} t/m ${data.end})`;
  await insertRequest(current, "update", id, summary, data);
}

export async function proposeDeleteQuickJob(id: string, title: string) {
  const current = await requireEditRequester();
  const summary = `Voorstel om te verwijderen: "${title}"`;
  await insertRequest(current, "delete", id, summary, {});
}

export async function proposeUpdateQuickJobDayAssignment(id: string, title: string, data: DayAssignmentPayload) {
  const current = await requireEditRequester();
  const summary = `Voorstel dagbezetting: "${title}" op ${data.date}`;
  await insertRequest(current, "day_assignment", id, summary, data);
}

// Een teamlid mag een eigen, nog onbehandeld voorstel gewoon weer
// intrekken — RLS staat delete alleen toe zolang status 'pending' is.
export async function cancelChangeRequest(id: string) {
  const current = await requireUser();
  const supabase = createClient();
  const { error } = await supabase.from("planning_change_requests").delete().eq("id", id).eq("requested_by", current.id);
  if (error) throw new Error(error.message);
  revalidatePath("/planning-overzicht");
}

export async function approveChangeRequest(id: string) {
  await requireOwner();
  const supabase = createClient();
  const { data: reqRow, error } = await supabase.from("planning_change_requests").select("*").eq("id", id).single();
  if (error || !reqRow) throw new Error(error?.message || "Voorstel niet gevonden.");
  if (reqRow.status !== "pending") throw new Error("Dit voorstel is al behandeld.");

  const payload = reqRow.payload as CreatePayload & UpdatePayload & DayAssignmentPayload;
  if (reqRow.action === "create") {
    await createQuickJob(payload);
  } else if (reqRow.action === "update") {
    await updateQuickJob(reqRow.quick_job_id as string, payload);
  } else if (reqRow.action === "delete") {
    await deleteQuickJob(reqRow.quick_job_id as string);
  } else if (reqRow.action === "day_assignment") {
    await updateQuickJobDayAssignment(reqRow.quick_job_id as string, payload.date, payload.teamMemberIds, payload.daypart);
  }

  const { error: updErr } = await supabase
    .from("planning_change_requests")
    .update({ status: "approved", reviewed_at: new Date().toISOString() })
    .eq("id", id);
  if (updErr) throw new Error(updErr.message);
  revalidatePath("/planning-overzicht");

  await sendPushToUsers([reqRow.requested_by as string], {
    title: "Voorstel goedgekeurd",
    body: reqRow.summary as string,
    url: "/planning-overzicht",
  });
}

export async function rejectChangeRequest(id: string) {
  await requireOwner();
  const supabase = createClient();
  const { data: reqRow, error } = await supabase.from("planning_change_requests").select("*").eq("id", id).single();
  if (error || !reqRow) throw new Error(error?.message || "Voorstel niet gevonden.");
  if (reqRow.status !== "pending") throw new Error("Dit voorstel is al behandeld.");

  const { error: updErr } = await supabase
    .from("planning_change_requests")
    .update({ status: "rejected", reviewed_at: new Date().toISOString() })
    .eq("id", id);
  if (updErr) throw new Error(updErr.message);
  revalidatePath("/planning-overzicht");

  await sendPushToUsers([reqRow.requested_by as string], {
    title: "Voorstel afgewezen",
    body: reqRow.summary as string,
    url: "/planning-overzicht",
  });
}
