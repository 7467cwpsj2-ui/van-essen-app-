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
