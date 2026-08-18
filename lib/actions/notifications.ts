"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export async function markNotificationRead(id: string) {
  const current = await requireUser();
  const supabase = createClient();
  const { error } = await supabase.from("notifications").update({ read: true }).eq("id", id).eq("user_id", current.id);
  if (error) throw new Error(error.message);
  revalidatePath("/dashboard", "layout");
}

export async function markAllNotificationsRead() {
  const current = await requireUser();
  const supabase = createClient();
  const { error } = await supabase.from("notifications").update({ read: true }).eq("user_id", current.id).eq("read", false);
  if (error) throw new Error(error.message);
  revalidatePath("/dashboard", "layout");
}
