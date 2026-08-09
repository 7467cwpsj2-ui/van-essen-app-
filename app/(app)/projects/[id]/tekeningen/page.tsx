import { canSeeModule, requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
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
  const withUrls: DrawingWithUrl[] = await Promise.all(
    rows.map(async (d) => {
      let signedUrl: string | null = null;
      if (d.file_path) {
        const { data } = await supabase.storage.from("project-files").createSignedUrl(d.file_path, 3600);
        signedUrl = data?.signedUrl ?? null;
      }
      return { ...d, signedUrl };
    })
  );

  return <DrawingsPanel projectId={params.id} role={current.profile.role} currentUserId={current.id} drawings={withUrls} />;
}
