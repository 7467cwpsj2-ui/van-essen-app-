"use server";

import { revalidatePath } from "next/cache";
import { requireOwner } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export async function updateCalc(projectId: string, data: { quoteAmount: number; actualCost: number }) {
  await requireOwner();
  const supabase = createClient();
  const { error } = await supabase
    .from("projects")
    .update({ quote_amount: data.quoteAmount, actual_cost: data.actualCost })
    .eq("id", projectId);
  if (error) throw new Error(error.message);
  revalidatePath(`/projects/${projectId}/nacalculatie`);
  revalidatePath(`/projects/${projectId}/dossier`);
}
