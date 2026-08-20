import { NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { loadAuthorizationData } from "@/lib/authorizationData";
import { AuthorizationDocument } from "@/lib/pdf/AuthorizationDocument";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request, { params }: { params: { id: string } }) {
  await requireUser();
  const supabase = createClient();
  const data = await loadAuthorizationData(supabase, params.id, 300);
  if (!data || !data.authorization || data.authorization.status !== "ondertekend") {
    return new NextResponse("Geen ondertekende machtiging gevonden", { status: 404 });
  }

  const buffer = await renderToBuffer(
    <AuthorizationDocument
      project={data.project}
      clientName={data.clientName}
      company={data.company}
      authorization={data.authorization}
      signatureUrl={data.signatureUrl}
    />
  );

  const filename = `machtiging-isde-${data.project.name.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}.pdf`;
  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${filename}"`,
    },
  });
}
