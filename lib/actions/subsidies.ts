"use server";

import { revalidatePath } from "next/cache";
import { requireOwner, requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export interface SubsidyProductInput {
  category: string;
  measure: string;
  manufacturer: string | null;
  productName: string;
  type: string | null;
  meldcode: string | null;
  unit: string;
  subsidyAmount: number;
  validFrom: string | null;
  validTo: string | null;
  notes: string | null;
}

// Meldcodedatabase — alleen de eigenaar beheert deze, want bedragen en
// meldcodes wijzigen per RVO-jaargang en mogen nooit stilzwijgend een al
// gemaakte subsidiecheck op een project veranderen (die is een snapshot,
// zie subsidy_check_items).
export async function createSubsidyProduct(data: SubsidyProductInput) {
  await requireOwner();
  if (!data.category.trim() || !data.measure.trim() || !data.productName.trim()) {
    throw new Error("Categorie, maatregel en productnaam zijn verplicht.");
  }
  const supabase = createClient();
  const { error } = await supabase.from("subsidy_products").insert({
    category: data.category.trim(),
    measure: data.measure.trim(),
    manufacturer: data.manufacturer?.trim() || null,
    product_name: data.productName.trim(),
    type: data.type?.trim() || null,
    meldcode: data.meldcode?.trim() || null,
    unit: data.unit.trim() || "stuk",
    subsidy_amount: data.subsidyAmount,
    valid_from: data.validFrom || null,
    valid_to: data.validTo || null,
    notes: data.notes?.trim() || null,
  });
  if (error) throw new Error(error.message);
  revalidatePath("/subsidies");
}

export async function updateSubsidyProduct(id: string, data: SubsidyProductInput) {
  await requireOwner();
  if (!data.category.trim() || !data.measure.trim() || !data.productName.trim()) {
    throw new Error("Categorie, maatregel en productnaam zijn verplicht.");
  }
  const supabase = createClient();
  const { error } = await supabase
    .from("subsidy_products")
    .update({
      category: data.category.trim(),
      measure: data.measure.trim(),
      manufacturer: data.manufacturer?.trim() || null,
      product_name: data.productName.trim(),
      type: data.type?.trim() || null,
      meldcode: data.meldcode?.trim() || null,
      unit: data.unit.trim() || "stuk",
      subsidy_amount: data.subsidyAmount,
      valid_from: data.validFrom || null,
      valid_to: data.validTo || null,
      notes: data.notes?.trim() || null,
    })
    .eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/subsidies");
}

export async function toggleSubsidyProductActive(id: string, active: boolean) {
  await requireOwner();
  const supabase = createClient();
  const { error } = await supabase.from("subsidy_products").update({ active }).eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/subsidies");
}

export async function deleteSubsidyProduct(id: string) {
  await requireOwner();
  const supabase = createClient();
  const { error } = await supabase.from("subsidy_products").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/subsidies");
}

// Voegt een regel toe aan de subsidiecheck van een project. Legt de
// productgegevens vast zoals ze op dít moment in de meldcodedatabase
// staan (snapshot) — latere wijzigingen aan het product raken deze regel
// dus niet meer.
export async function addSubsidyCheckItem(
  projectId: string,
  productId: string,
  quantity: number,
  executionDate: string | null,
  notes: string | null
) {
  const current = await requireUser();
  if (!(quantity > 0)) throw new Error("Aantal moet groter dan 0 zijn.");
  const supabase = createClient();
  const { data: product, error: productError } = await supabase
    .from("subsidy_products")
    .select("*")
    .eq("id", productId)
    .single();
  if (productError || !product) throw new Error("Product niet gevonden.");

  const { error } = await supabase.from("subsidy_check_items").insert({
    project_id: projectId,
    product_id: product.id,
    category: product.category,
    measure: product.measure,
    manufacturer: product.manufacturer,
    product_name: product.product_name,
    type: product.type,
    meldcode: product.meldcode,
    quantity,
    unit: product.unit,
    amount_per_unit: product.subsidy_amount,
    indicative_subsidy: quantity * Number(product.subsidy_amount),
    execution_date: executionDate || null,
    notes: notes?.trim() || null,
    created_by: current.profile.name,
  });
  if (error) throw new Error(error.message);
  revalidatePath(`/projects/${projectId}/subsidie`);
}

export async function updateSubsidyCheckItem(
  id: string,
  projectId: string,
  quantity: number,
  executionDate: string | null,
  notes: string | null
) {
  await requireUser();
  if (!(quantity > 0)) throw new Error("Aantal moet groter dan 0 zijn.");
  const supabase = createClient();
  const { data: item, error: itemError } = await supabase
    .from("subsidy_check_items")
    .select("amount_per_unit")
    .eq("id", id)
    .single();
  if (itemError || !item) throw new Error("Regel niet gevonden.");

  const { error } = await supabase
    .from("subsidy_check_items")
    .update({
      quantity,
      execution_date: executionDate || null,
      notes: notes?.trim() || null,
      indicative_subsidy: quantity * Number(item.amount_per_unit),
    })
    .eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath(`/projects/${projectId}/subsidie`);
}

export async function deleteSubsidyCheckItem(id: string, projectId: string) {
  await requireUser();
  const supabase = createClient();
  const { error } = await supabase.from("subsidy_check_items").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath(`/projects/${projectId}/subsidie`);
}
