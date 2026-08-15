"use server";

import { revalidatePath } from "next/cache";
import { requireOwner } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { ExtraWorkVatType } from "@/types/database";

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

export async function createCostItem(projectId: string, data: { description: string; amount: number; vatType?: ExtraWorkVatType }) {
  await requireOwner();
  if (!data.description.trim()) throw new Error("Omschrijving is verplicht.");
  const supabase = createClient();
  const { error } = await supabase
    .from("cost_items")
    .insert({ project_id: projectId, description: data.description.trim(), amount: data.amount, vat_type: data.vatType ?? "excl" });
  if (error) throw new Error(error.message);
  revalidatePath(`/projects/${projectId}/nacalculatie`);
}

export async function deleteCostItem(projectId: string, costItemId: string) {
  await requireOwner();
  const supabase = createClient();
  const { error } = await supabase.from("cost_items").delete().eq("id", costItemId);
  if (error) throw new Error(error.message);
  revalidatePath(`/projects/${projectId}/nacalculatie`);
}
