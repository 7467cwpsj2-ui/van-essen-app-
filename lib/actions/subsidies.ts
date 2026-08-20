"use server";

import { revalidatePath } from "next/cache";
import { requireOwner, requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { SubsidyApplicationStatus } from "@/types/database";

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
  if (current.profile.role !== "eigenaar") throw new Error("Alleen de eigenaar heeft toegang tot de subsidiemodule.");
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
  const current = await requireUser();
  if (current.profile.role !== "eigenaar") throw new Error("Alleen de eigenaar heeft toegang tot de subsidiemodule.");
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
  const current = await requireUser();
  if (current.profile.role !== "eigenaar") throw new Error("Alleen de eigenaar heeft toegang tot de subsidiemodule.");
  const supabase = createClient();
  const { error } = await supabase.from("subsidy_check_items").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath(`/projects/${projectId}/subsidie`);
}

// Bewijsbijlagen bij een subsidieregel (foto's zoals tijdens de
// uitvoering of het typeplaatje, maar ook documenten zoals een factuur
// als PDF) — het bestand zelf is al geüpload naar Storage door de
// aanroeper, deze slaat alleen het pad vast.
export async function addSubsidyCheckItemPhoto(
  checkItemId: string,
  projectId: string,
  filePath: string,
  fileType: "image" | "pdf",
  caption: string | null
) {
  const current = await requireUser();
  if (current.profile.role !== "eigenaar") throw new Error("Alleen de eigenaar heeft toegang tot de subsidiemodule.");
  const supabase = createClient();
  const { error } = await supabase.from("subsidy_check_item_photos").insert({
    check_item_id: checkItemId,
    project_id: projectId,
    file_path: filePath,
    file_type: fileType,
    caption: caption?.trim() || null,
    uploaded_by: current.profile.name,
  });
  if (error) throw new Error(error.message);
  revalidatePath(`/projects/${projectId}/subsidie`);
}

export async function deleteSubsidyCheckItemPhoto(id: string, projectId: string) {
  const current = await requireUser();
  if (current.profile.role !== "eigenaar") throw new Error("Alleen de eigenaar heeft toegang tot de subsidiemodule.");
  const supabase = createClient();
  const { data: photo } = await supabase.from("subsidy_check_item_photos").select("file_path").eq("id", id).single();
  const { error } = await supabase.from("subsidy_check_item_photos").delete().eq("id", id);
  if (error) throw new Error(error.message);
  if (photo?.file_path) await supabase.storage.from("project-files").remove([photo.file_path as string]);
  revalidatePath(`/projects/${projectId}/subsidie`);
}

// Machtiging (ISDE-machtigingsformulier voor woningeigenaren) — de
// eigenaar vraagt 'm aan, de klant tekent zelf digitaal, net als bij
// meerwerk en het opleverdossier.
export async function requestSubsidyAuthorization(projectId: string) {
  const current = await requireUser();
  if (current.profile.role !== "eigenaar") throw new Error("Alleen de eigenaar kan een machtiging aanvragen.");
  const supabase = createClient();
  const { error } = await supabase.from("subsidy_authorizations").insert({
    project_id: projectId,
    scope: "aanvraag_beheer_bezwaar",
    status: "wacht_op_klant",
    requested_by: current.profile.name,
  });
  if (error) throw new Error(error.message);
  revalidatePath(`/projects/${projectId}/machtiging`);
}

// Trekt een nog niet ondertekende aanvraag weer in, zodat opnieuw
// aangevraagd kan worden (bv. bij een tikfout).
export async function cancelSubsidyAuthorization(id: string, projectId: string) {
  const current = await requireUser();
  if (current.profile.role !== "eigenaar") throw new Error("Alleen de eigenaar kan dit intrekken.");
  const supabase = createClient();
  const { error } = await supabase.from("subsidy_authorizations").delete().eq("id", id).eq("status", "wacht_op_klant");
  if (error) throw new Error(error.message);
  revalidatePath(`/projects/${projectId}/machtiging`);
}

export interface SubsidyApplicationInput {
  status: SubsidyApplicationStatus;
  applicationNumber: string | null;
  submittedAt: string | null;
  decisionAmount: number | null;
  notes: string | null;
}

// Aanvraagregistratie: puur eigen administratie van wat de eigenaar zelf
// bij RVO heeft ingediend (via eHerkenning, buiten de app) — de app
// dient nooit zelf iets in.
export async function saveSubsidyApplication(projectId: string, data: SubsidyApplicationInput) {
  const current = await requireUser();
  if (current.profile.role !== "eigenaar") throw new Error("Alleen de eigenaar heeft toegang tot de subsidiemodule.");
  const supabase = createClient();
  const { error } = await supabase.from("subsidy_applications").upsert(
    {
      project_id: projectId,
      status: data.status,
      application_number: data.applicationNumber?.trim() || null,
      submitted_at: data.submittedAt || null,
      decision_amount: data.decisionAmount,
      notes: data.notes?.trim() || null,
      updated_by: current.profile.name,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "project_id" }
  );
  if (error) throw new Error(error.message);
  revalidatePath(`/projects/${projectId}/subsidie`);
}

// De klant zet hier zijn handtekening — de handtekening zelf is al
// geüpload naar Storage door de aanroeper, dit legt alleen de
// ondertekening vast. Bewust idempotent (net als bij meerwerk): een
// dubbele tik op "Ondertekenen" faalt niet, maar doet ook niets extra's.
export async function signSubsidyAuthorization(id: string, projectId: string, signaturePath: string) {
  const current = await requireUser();
  if (current.profile.role !== "klant") throw new Error("Alleen de klant kan dit ondertekenen.");
  const supabase = createClient();
  const { data: existing } = await supabase.from("subsidy_authorizations").select("status").eq("id", id).single();
  if (existing?.status === "ondertekend") return;
  const { error } = await supabase
    .from("subsidy_authorizations")
    .update({
      status: "ondertekend",
      client_signature_path: signaturePath,
      client_signed_by: current.profile.name,
      client_signed_at: new Date().toISOString(),
    })
    .eq("id", id)
    .eq("status", "wacht_op_klant");
  if (error) throw new Error(error.message);
  revalidatePath(`/projects/${projectId}/machtiging`);
}
