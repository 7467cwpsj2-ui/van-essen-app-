"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireOwner } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { LeadStatus } from "@/types/database";

export interface LeadInput {
  clientName: string;
  address: string | null;
  phone: string | null;
  email: string | null;
  description: string | null;
  visitDate: string | null;
}

export async function createLead(data: LeadInput) {
  const current = await requireOwner();
  if (!data.clientName.trim()) throw new Error("Naam is verplicht.");
  const supabase = createClient();
  const { error } = await supabase.from("leads").insert({
    client_name: data.clientName.trim(),
    address: data.address?.trim() || null,
    phone: data.phone?.trim() || null,
    email: data.email?.trim() || null,
    description: data.description?.trim() || null,
    visit_date: data.visitDate || null,
    created_by: current.id,
  });
  if (error) throw new Error(error.message);
  revalidatePath("/offertes");
  revalidatePath("/dashboard");
}

export async function updateLead(id: string, data: LeadInput) {
  await requireOwner();
  if (!data.clientName.trim()) throw new Error("Naam is verplicht.");
  const supabase = createClient();
  const { error } = await supabase
    .from("leads")
    .update({
      client_name: data.clientName.trim(),
      address: data.address?.trim() || null,
      phone: data.phone?.trim() || null,
      email: data.email?.trim() || null,
      description: data.description?.trim() || null,
      visit_date: data.visitDate || null,
    })
    .eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/offertes");
  revalidatePath("/dashboard");
}

export async function updateLeadStatus(id: string, status: LeadStatus) {
  await requireOwner();
  const supabase = createClient();
  const { error } = await supabase
    .from("leads")
    .update({ status, last_reminder_sent_at: null })
    .eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/offertes");
  revalidatePath("/dashboard");
}

export async function deleteLead(id: string) {
  await requireOwner();
  const supabase = createClient();
  const { error } = await supabase.from("leads").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/offertes");
  revalidatePath("/dashboard");
}

// Maakt in één keer een nieuw project van een gewonnen aanvraag, met
// naam/adres alvast ingevuld — scheelt dubbel typen. De klant zelf
// koppel je daarna zoals gebruikelijk (Klanten-pagina), want een lead
// heeft nog geen klantaccount.
export async function convertLeadToProject(id: string) {
  const current = await requireOwner();
  const supabase = createClient();
  const { data: lead } = await supabase.from("leads").select("client_name,address").eq("id", id).single();
  if (!lead) throw new Error("Aanvraag niet gevonden.");

  const { data: project, error } = await supabase
    .from("projects")
    .insert({ name: lead.client_name, address: lead.address, created_by: current.id })
    .select()
    .single();
  if (error || !project) throw new Error(error?.message || "Kon project niet aanmaken.");

  await supabase.from("leads").update({ status: "gewonnen", converted_project_id: project.id }).eq("id", id);
  revalidatePath("/offertes");
  revalidatePath("/dashboard");
  redirect(`/projects/${project.id}/planning`);
}
