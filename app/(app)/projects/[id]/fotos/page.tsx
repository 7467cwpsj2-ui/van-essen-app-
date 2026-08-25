import { canSeeModule, requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { signedUrlMap } from "@/lib/storage";
import { PhotosPanel, type PhotoWithUrl } from "@/components/PhotosPanel";
import type { Photo } from "@/types/database";

export default async function FotosPage({ params }: { params: { id: string } }) {
  const current = await requireUser();
  if (!canSeeModule(current, "fotos")) {
    return <div className="empty-hint">Je hebt geen toegang tot deze module.</div>;
  }

  const supabase = createClient();
  const { data: photos } = await supabase
    .from("photos")
    .select("*")
    .eq("project_id", params.id)
    .order("created_at", { ascending: false });

  const rows = (photos ?? []) as Photo[];
  const urlByPath = await signedUrlMap(
    supabase,
    "project-files",
    rows.map((ph) => ph.file_path)
  );
  const withUrls: PhotoWithUrl[] = rows.map((ph) => ({ ...ph, signedUrl: (ph.file_path ? urlByPath.get(ph.file_path) : null) ?? null }));

  return <PhotosPanel projectId={params.id} role={current.profile.role} currentUserId={current.id} photos={withUrls} />;
}
