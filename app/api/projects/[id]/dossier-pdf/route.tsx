import { NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { canSeeModule, requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { DossierDocument } from "@/lib/pdf/DossierDocument";
import type { CompletionPoint, ExtraWork, Photo, Project, WarrantyItem } from "@/types/database";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request, { params }: { params: { id: string } }) {
  const current = await requireUser();
  if (!canSeeModule(current, "dossier")) {
    return new NextResponse("Geen toegang", { status: 403 });
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

  if (!project) return new NextResponse("Project niet gevonden", { status: 404 });
  const p = project as Project;

  let clientName: string | null = null;
  if (p.client_id) {
    const { data: client } = await supabase.from("clients").select("name").eq("id", p.client_id).single();
    clientName = client?.name ?? null;
  }

  const photoRows = (photos ?? []) as Photo[];
  const photoData = (
    await Promise.all(
      photoRows.map(async (ph) => {
        if (!ph.file_path) return null;
        const { data } = await supabase.storage.from("project-files").createSignedUrl(ph.file_path, 300);
        return data?.signedUrl ? { title: ph.title, url: data.signedUrl } : null;
      })
    )
  ).filter((x): x is { title: string; url: string } => x !== null);

  let signatureUrl: string | null = null;
  if (p.delivery_signature_path) {
    const { data } = await supabase.storage.from("project-files").createSignedUrl(p.delivery_signature_path, 300);
    signatureUrl = data?.signedUrl ?? null;
  }

  const buffer = await renderToBuffer(
    <DossierDocument
      project={p}
      clientName={clientName}
      completionPoints={(completionPoints ?? []) as CompletionPoint[]}
      extraWork={(extraWork ?? []) as ExtraWork[]}
      warrantyItems={(warrantyItems ?? []) as WarrantyItem[]}
      photos={photoData}
      signatureUrl={signatureUrl}
    />
  );

  const filename = `opleverdossier-${p.name.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}.pdf`;
  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
