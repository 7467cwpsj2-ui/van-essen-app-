import { canSeeModule, requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
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
  const withUrls: PhotoWithUrl[] = await Promise.all(
    rows.map(async (ph) => {
      let signedUrl: string | null = null;
      if (ph.file_path) {
        const { data } = await supabase.storage.from("project-files").createSignedUrl(ph.file_path, 3600);
        signedUrl = data?.signedUrl ?? null;
      }
      return { ...ph, signedUrl };
    })
  );

  return <PhotosPanel projectId={params.id} role={current.profile.role} currentUserId={current.id} photos={withUrls} />;
}
