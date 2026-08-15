import QRCode from "qrcode";
import { canSeeModule, requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { loadDossierData } from "@/lib/dossierData";
import { DossierPanel } from "@/components/DossierPanel";

export default async function DossierPage({ params }: { params: { id: string } }) {
  const current = await requireUser();
  if (!canSeeModule(current, "dossier")) {
    return <div className="empty-hint">Je hebt geen toegang tot deze module.</div>;
  }

  const supabase = createClient();
  const data = await loadDossierData(supabase, params.id);
  if (!data) return <div className="empty-hint">Project niet gevonden.</div>;

  let reviewQrDataUrl: string | null = null;
  if (data.project.delivery_signed_at && data.reviewUrl) {
    reviewQrDataUrl = await QRCode.toDataURL(data.reviewUrl, { margin: 1, width: 200 });
  }

  const shareUrl = data.project.dossier_share_token
    ? `${process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"}/d/${data.project.dossier_share_token}`
    : null;

  return (
    <DossierPanel
      projectId={params.id}
      role={current.profile.role}
      project={data.project}
      completionPoints={data.completionPoints}
      meerwerkAkkoord={data.extraWork.filter((w) => w.type === "meerwerk").reduce((s, w) => s + Number(w.amount), 0)}
      minderwerkAkkoord={data.extraWork.filter((w) => w.type === "minderwerk").reduce((s, w) => s + Number(w.amount), 0)}
      warrantyItems={data.warrantyItems}
      photosByCategory={data.photosByCategory}
      clientChoices={data.clientChoices}
      drawings={data.drawings}
      signatureUrl={data.signatureUrl}
      reviewQrDataUrl={reviewQrDataUrl}
      shareUrl={shareUrl}
    />
  );
}
