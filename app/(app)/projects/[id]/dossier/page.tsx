import { canSeeModule, requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { DossierPanel } from "@/components/DossierPanel";
import type { CompletionPoint, ExtraWork, Photo, Project, WarrantyItem } from "@/types/database";

export default async function DossierPage({ params }: { params: { id: string } }) {
  const current = await requireUser();
  if (!canSeeModule(current, "dossier")) {
    return <div className="empty-hint">Je hebt geen toegang tot deze module.</div>;
  }

  const supabase = createClient();
  const [{ data: project }, { data: completionPoints }, { data: extraWork }, { data: warrantyItems }, { data: photos }] =
    await Promise.all([
      supabase.from("projects").select("*").eq("id", params.id).single(),
      supabase.from("completion_points").select("*").eq("project_id", params.id).order("created_at"),
      supabase.from("extra_work").select("*").eq("project_id", params.id).eq("status", "akkoord"),
      supabase.from("warranty_items").select("*").eq("project_id", params.id).order("created_at"),
      supabase.from("photos").select("*").eq("project_id", params.id).eq("category", "oplevering"),
    ]);

  if (!project) return <div className="empty-hint">Project niet gevonden.</div>;
  const p = project as Project;

  const extraWorkRows = (extraWork ?? []) as ExtraWork[];
  const meerwerkAkkoord = extraWorkRows.filter((w) => w.type === "meerwerk").reduce((s, w) => s + Number(w.amount), 0);
  const minderwerkAkkoord = extraWorkRows.filter((w) => w.type === "minderwerk").reduce((s, w) => s + Number(w.amount), 0);

  const photoRows = (photos ?? []) as Photo[];
  const deliveryPhotos = await Promise.all(
    photoRows.map(async (ph) => {
      let signedUrl: string | null = null;
      if (ph.file_path) {
        const { data } = await supabase.storage.from("project-files").createSignedUrl(ph.file_path, 3600);
        signedUrl = data?.signedUrl ?? null;
      }
      return { id: ph.id, title: ph.title, signedUrl };
    })
  );

  let signatureUrl: string | null = null;
  if (p.delivery_signature_path) {
    const { data } = await supabase.storage.from("project-files").createSignedUrl(p.delivery_signature_path, 3600);
    signatureUrl = data?.signedUrl ?? null;
  }

  return (
    <DossierPanel
      projectId={params.id}
      role={current.profile.role}
      project={p}
      completionPoints={(completionPoints ?? []) as CompletionPoint[]}
      meerwerkAkkoord={meerwerkAkkoord}
      minderwerkAkkoord={minderwerkAkkoord}
      warrantyItems={(warrantyItems ?? []) as WarrantyItem[]}
      deliveryPhotos={deliveryPhotos}
      signatureUrl={signatureUrl}
    />
  );
}
