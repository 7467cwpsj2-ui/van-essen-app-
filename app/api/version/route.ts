import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// Wordt door components/UpdateChecker.tsx opgevraagd om te bepalen of er
// een nieuwere deploy live staat dan de versie die de client nu draait.
export async function GET() {
  return NextResponse.json(
    { buildId: process.env.NEXT_PUBLIC_BUILD_ID || "" },
    { headers: { "Cache-Control": "no-store, must-revalidate" } }
  );
}
