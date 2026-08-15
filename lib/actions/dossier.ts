"use server";

import { randomUUID } from "crypto";
import { revalidatePath } from "next/cache";
import { requireOwner, requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { WarrantyUnit } from "@/types/database";

const siteUrl = () => process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

export async function updateDossierSettings(
  projectId: string,
  data: { deliveryDate: string | null; warrantyText: string | null; deliveryReady: boolean }
) {
  await requireOwner();
  const supabase = createClient();
  const { error } = await supabase
    .from("projects")
    .update({
      delivery_date: data.deliveryDate || null,
      warranty_text: data.warrantyText || null,
      delivery_ready: data.deliveryReady,
    })
    .eq("id", projectId);
  if (error) throw new Error(error.message);
  revalidatePath(`/projects/${projectId}/dossier`);
}

export async function createWarrantyItem(projectId: string, item: string, amount: number, unit: WarrantyUnit) {
  await requireOwner();
  if (!item.trim() || !(amount > 0)) throw new Error("Item en aantal zijn verplicht.");
  const supabase = createClient();
  const { error } = await supabase.from("warranty_items").insert({ project_id: projectId, item: item.trim(), amount, unit });
  if (error) throw new Error(error.message);
  revalidatePath(`/projects/${projectId}/dossier`);
}

export async function deleteWarrantyItem(projectId: string, id: string) {
  await requireOwner();
  const supabase = createClient();
  const { error } = await supabase.from("warranty_items").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath(`/projects/${projectId}/dossier`);
}

export async function getOrCreateDossierShareLink(projectId: string): Promise<string> {
  await requireOwner();
  const supabase = createClient();
  const { data: existing } = await supabase.from("projects").select("dossier_share_token").eq("id", projectId).single();
  let token = existing?.dossier_share_token as string | null | undefined;
  if (!token) {
    token = randomUUID();
    const { error } = await supabase.from("projects").update({ dossier_share_token: token }).eq("id", projectId);
    if (error) throw new Error(error.message);
    revalidatePath(`/projects/${projectId}/dossier`);
  }
  return `${siteUrl()}/d/${token}`;
}

export async function revokeDossierShareLink(projectId: string) {
  await requireOwner();
  const supabase = createClient();
  const { error } = await supabase.from("projects").update({ dossier_share_token: null }).eq("id", projectId);
  if (error) throw new Error(error.message);
  revalidatePath(`/projects/${projectId}/dossier`);
}

export async function signDelivery(projectId: string, signaturePath: string) {
  await requireUser();
  const supabase = createClient();
  const { error } = await supabase.rpc("sign_delivery", { p_project_id: projectId, p_signature_path: signaturePath });
  if (error) throw new Error(error.message);
  revalidatePath(`/projects/${projectId}/dossier`);
  revalidatePath("/dashboard");
}
