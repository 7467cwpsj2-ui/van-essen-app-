"use server";

import { revalidatePath } from "next/cache";
import { requireOwner } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export async function updateGoogleReviewUrl(url: string) {
  await requireOwner();
  const trimmed = url.trim();
  if (trimmed && !/^https:\/\//.test(trimmed)) throw new Error("De link moet met https:// beginnen.");
  const supabase = createClient();
  const { error } = await supabase.from("app_settings").update({ google_review_url: trimmed || null }).eq("id", true);
  if (error) throw new Error(error.message);
  revalidatePath("/instellingen");
}

export async function updateLeadReminderDays(days: number) {
  await requireOwner();
  if (!(days >= 1)) throw new Error("Moet minstens 1 dag zijn.");
  const supabase = createClient();
  const { error } = await supabase.from("app_settings").update({ lead_reminder_days: Math.round(days) }).eq("id", true);
  if (error) throw new Error(error.message);
  revalidatePath("/instellingen");
}

export interface CompanyDetailsInput {
  companyName: string;
  companyKvk: string;
  companyAddress: string;
  companyPostalCity: string;
  companyPhone: string;
  companyEmail: string;
}

// Bedrijfsgegevens van Van Essen zelf, o.a. gebruikt als "gemachtigde"
// op het ISDE-machtigingsformulier.
export async function updateCompanyDetails(data: CompanyDetailsInput) {
  await requireOwner();
  if (!data.companyName.trim()) throw new Error("Bedrijfsnaam is verplicht.");
  const supabase = createClient();
  const { error } = await supabase
    .from("app_settings")
    .update({
      company_name: data.companyName.trim(),
      company_kvk: data.companyKvk.trim() || null,
      company_address: data.companyAddress.trim() || null,
      company_postal_city: data.companyPostalCity.trim() || null,
      company_phone: data.companyPhone.trim() || null,
      company_email: data.companyEmail.trim() || null,
    })
    .eq("id", true);
  if (error) throw new Error(error.message);
  revalidatePath("/instellingen");
}
