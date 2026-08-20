import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getProjectClientName } from "@/lib/clientNames";
import type { Project, SubsidyCheckItem } from "@/types/database";

export interface SubsidyDocumentData {
  project: Project;
  clientName: string | null;
  items: SubsidyCheckItem[];
  totalIndicativeSubsidy: number;
  checkedAt: string;
}

// Eén centrale plek om de subsidiecheck van een project op te halen —
// gebruikt door zowel het scherm als de PDF-export, zodat die twee nooit
// uit de pas kunnen lopen.
export async function loadSubsidyData(supabase: SupabaseClient, projectId: string): Promise<SubsidyDocumentData | null> {
  const [{ data: project }, { data: items }] = await Promise.all([
    supabase.from("projects").select("*").eq("id", projectId).single(),
    supabase.from("subsidy_check_items").select("*").eq("project_id", projectId).order("created_at"),
  ]);
  if (!project) return null;
  const p = project as Project;
  const clientName = await getProjectClientName(supabase, projectId, p.client_id);
  const rows = (items ?? []) as SubsidyCheckItem[];

  return {
    project: p,
    clientName,
    items: rows,
    totalIndicativeSubsidy: rows.reduce((s, r) => s + Number(r.indicative_subsidy), 0),
    checkedAt: rows.length ? rows[rows.length - 1].created_at : new Date().toISOString(),
  };
}
