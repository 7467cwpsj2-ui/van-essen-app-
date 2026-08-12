import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

// Vaste, interne link die de pushmelding gebruikt in plaats van de externe
// Google-link zelf — een geopende tab kan alleen naar een same-origin URL
// genavigeerd worden (client.navigate() in de service worker), dus deze
// route stuurt van hieruit pas door naar de echte, in te stellen reviewlink.
export async function GET() {
  const admin = createAdminClient();
  const { data } = await admin.from("app_settings").select("google_review_url").eq("id", true).single();
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
  return NextResponse.redirect((data?.google_review_url as string | undefined) || `${siteUrl}/dashboard`);
}
