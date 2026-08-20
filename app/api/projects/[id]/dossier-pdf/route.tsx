import { NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import QRCode from "qrcode";
import { canSeeModule, requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { loadDossierData } from "@/lib/dossierData";
import { DossierDocument } from "@/lib/pdf/DossierDocument";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request, { params }: { params: { id: string } }) {
  const current = await requireUser();
  if (!canSeeModule(current, "dossier")) {
    return new NextResponse("Geen toegang", { status: 403 });
  }

  const supabase = createClient();
  const data = await loadDossierData(supabase, params.id, 300);
  if (!data) return new NextResponse("Project niet gevonden", { status: 404 });

  let reviewQrDataUrl: string | null = null;
  if (data.project.delivery_signed_at && data.reviewUrl) {
    reviewQrDataUrl = await QRCode.toDataURL(data.reviewUrl, { margin: 1, width: 200 });
  }

  const buffer = await renderToBuffer(
    <DossierDocument
      project={data.project}
      clientName={data.clientName}
      completionPoints={data.completionPoints}
      extraWork={data.extraWork}
      warrantyItems={data.warrantyItems}
      photosByCategory={data.photosByCategory}
      clientChoices={data.clientChoices}
      drawings={data.drawings}
      signatureUrl={data.signatureUrl}
      reviewQrDataUrl={reviewQrDataUrl}
      coverPhotoUrl={data.coverPhotoUrl}
      company={data.company}
    />
  );

  const filename = `opleverdossier-${data.project.name.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}.pdf`;
  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${filename}"`,
    },
  });
}
