"use server";

import { revalidatePath } from "next/cache";
import { requireOwner } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { ExtraWorkVatType } from "@/types/database";

// Nacalculatie hoort bij precies één van de twee: een echt project, of
// een kleine klus (quick_jobs) — zelfde patroon als HoursTarget.
export type CalcTarget = { projectId: string; quickJobId?: undefined } | { projectId?: undefined; quickJobId: string };

function revalidateTarget(target: CalcTarget) {
  if (target.projectId) {
    revalidatePath(`/projects/${target.projectId}/nacalculatie`);
  } else {
    revalidatePath("/nacalculatie");
  }
}

export async function updateCalc(projectId: string, data: { quoteAmount: number; quoteVatType: ExtraWorkVatType }) {
  await requireOwner();
  const supabase = createClient();
  const { error } = await supabase
    .from("projects")
    .update({ quote_amount: data.quoteAmount, quote_vat_type: data.quoteVatType })
    .eq("id", projectId);
  if (error) throw new Error(error.message);
  revalidatePath(`/projects/${projectId}/nacalculatie`);
  revalidatePath(`/projects/${projectId}/dossier`);
}

// Zelfde idee als updateCalc, maar dan het "begroot"-bedrag van een
// losse klus — die heeft geen offerte, gewoon de afgesproken prijs.
export async function updateQuickJobPrice(quickJobId: string, data: { price: number; priceVatType: ExtraWorkVatType }) {
  await requireOwner();
  const supabase = createClient();
  const { error } = await supabase
    .from("quick_jobs")
    .update({ price: data.price, price_vat_type: data.priceVatType })
    .eq("id", quickJobId);
  if (error) throw new Error(error.message);
  revalidatePath("/nacalculatie");
  revalidatePath(`/klussen/${quickJobId}`);
}

export async function createCostItem(
  target: CalcTarget,
  data: { description: string; amount: number; vatType?: ExtraWorkVatType; supplier?: string | null; invoiceNumber?: string | null }
) {
  await requireOwner();
  if (!data.description.trim()) throw new Error("Omschrijving is verplicht.");
  const supabase = createClient();
  const { error } = await supabase.from("cost_items").insert({
    project_id: target.projectId ?? null,
    quick_job_id: target.quickJobId ?? null,
    description: data.description.trim(),
    amount: data.amount,
    vat_type: data.vatType ?? "excl",
    supplier: data.supplier?.trim() || null,
    invoice_number: data.invoiceNumber?.trim() || null,
  });
  if (error) throw new Error(error.message);
  revalidateTarget(target);
}

export async function updateCostItem(
  target: CalcTarget,
  costItemId: string,
  data: { description: string; amount: number; vatType: ExtraWorkVatType; supplier?: string | null; invoiceNumber?: string | null }
) {
  await requireOwner();
  if (!data.description.trim()) throw new Error("Omschrijving is verplicht.");
  const supabase = createClient();
  const { error } = await supabase
    .from("cost_items")
    .update({
      description: data.description.trim(),
      amount: data.amount,
      vat_type: data.vatType,
      supplier: data.supplier?.trim() || null,
      invoice_number: data.invoiceNumber?.trim() || null,
    })
    .eq("id", costItemId);
  if (error) throw new Error(error.message);
  revalidateTarget(target);
}

export async function deleteCostItem(target: CalcTarget, costItemId: string) {
  await requireOwner();
  const supabase = createClient();
  const { error } = await supabase.from("cost_items").delete().eq("id", costItemId);
  if (error) throw new Error(error.message);
  revalidateTarget(target);
}
