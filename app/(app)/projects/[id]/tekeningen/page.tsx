import { canSeeModule, requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { signedUrlMap } from "@/lib/storage";
import { DrawingsPanel, type DrawingWithUrl } from "@/components/DrawingsPanel";
import type { Drawing } from "@/types/database";

export default async function TekeningenPage({ params }: { params: { id: string } }) {
  const current = await requireUser();
  if (!canSeeModule(current, "tekeningen")) {
    return <div className="empty-hint">Je hebt geen toegang tot deze module.</div>;
  }

  const supabase = createClient();
  const { data: drawings } = await supabase
    .from("drawings")
    .select("*")
    .eq("project_id", params.id)
    .order("created_at", { ascending: false });

  const rows = (drawings ?? []) as Drawing[];
  const urlByPath = await signedUrlMap(
    supabase,
    "project-files",
    rows.map((d) => d.file_path)
  );
  const withUrls: DrawingWithUrl[] = rows.map((d) => ({ ...d, signedUrl: (d.file_path ? urlByPath.get(d.file_path) : null) ?? null }));

  return <DrawingsPanel projectId={params.id} role={current.profile.role} currentUserId={current.id} drawings={withUrls} />;
}
