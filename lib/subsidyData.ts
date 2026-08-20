import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getProjectClientName } from "@/lib/clientNames";
import type { Project, SubsidyCheckItem, SubsidyCheckItemPhoto } from "@/types/database";

export interface SubsidyDocumentPhoto {
  id: string;
  url: string | null;
  fileType: SubsidyCheckItemPhoto["file_type"];
}

export interface SubsidyDocumentData {
  project: Project;
  clientName: string | null;
  items: SubsidyCheckItem[];
  photosByItem: Record<string, SubsidyDocumentPhoto[]>;
  totalIndicativeSubsidy: number;
  checkedAt: string;
}

// Eén centrale plek om de subsidiecheck van een project op te halen —
// gebruikt door zowel het scherm als de PDF-export, zodat die twee nooit
// uit de pas kunnen lopen.
export async function loadSubsidyData(supabase: SupabaseClient, projectId: string, urlTtlSeconds = 3600): Promise<SubsidyDocumentData | null> {
  const [{ data: project }, { data: items }, { data: photos }] = await Promise.all([
    supabase.from("projects").select("*").eq("id", projectId).single(),
    supabase.from("subsidy_check_items").select("*").eq("project_id", projectId).order("created_at"),
    supabase.from("subsidy_check_item_photos").select("*").eq("project_id", projectId).order("created_at"),
  ]);
  if (!project) return null;
  const p = project as Project;
  const clientName = await getProjectClientName(supabase, projectId, p.client_id);
  const rows = (items ?? []) as SubsidyCheckItem[];

  const photosByItem: Record<string, SubsidyDocumentPhoto[]> = {};
  for (const ph of (photos ?? []) as SubsidyCheckItemPhoto[]) {
    const { data: signed } = await supabase.storage.from("project-files").createSignedUrl(ph.file_path, urlTtlSeconds);
    (photosByItem[ph.check_item_id] ??= []).push({ id: ph.id, url: signed?.signedUrl ?? null, fileType: ph.file_type });
  }

  return {
    project: p,
    clientName,
    items: rows,
    photosByItem,
    totalIndicativeSubsidy: rows.reduce((s, r) => s + Number(r.indicative_subsidy), 0),
    checkedAt: rows.length ? rows[rows.length - 1].created_at : new Date().toISOString(),
  };
}
