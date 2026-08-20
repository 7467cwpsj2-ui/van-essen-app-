import { NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { canSeeSubsidies, requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { loadSubsidyData } from "@/lib/subsidyData";
import { SubsidyDocument } from "@/lib/pdf/SubsidyDocument";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request, { params }: { params: { id: string } }) {
  const current = await requireUser();
  if (!canSeeSubsidies(current)) {
    return new NextResponse("Geen toegang", { status: 403 });
  }

  const supabase = createClient();
  const data = await loadSubsidyData(supabase, params.id);
  if (!data) return new NextResponse("Project niet gevonden", { status: 404 });

  const buffer = await renderToBuffer(
    <SubsidyDocument
      project={data.project}
      clientName={data.clientName}
      items={data.items}
      photosByItem={data.photosByItem}
      totalIndicativeSubsidy={data.totalIndicativeSubsidy}
      checkedAt={data.checkedAt}
    />
  );

  const filename = `subsidie-indicatie-${data.project.name.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}.pdf`;
  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${filename}"`,
    },
  });
}
