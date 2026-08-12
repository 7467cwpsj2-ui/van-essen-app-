import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getProjectClientUserIds, sendPushToUsers } from "@/lib/push";

export const dynamic = "force-dynamic";

const DAYS_AFTER_DELIVERY = 3;

// Draait dagelijks (zie vercel.json) en stuurt de klant, precies
// DAYS_AFTER_DELIVERY dagen nadat het opleverdossier is ondertekend,
// automatisch een pushmelding met het verzoek om een Google-review achter
// te laten — alleen als de eigenaar een reviewlink heeft ingesteld.
export async function GET(request: Request) {
  if (process.env.CRON_SECRET) {
    const authHeader = request.headers.get("authorization");
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return new NextResponse("Unauthorized", { status: 401 });
    }
  }

  const admin = createAdminClient();
  const { data: settings } = await admin.from("app_settings").select("google_review_url").eq("id", true).single();
  if (!settings?.google_review_url) {
    return NextResponse.json({ ok: true, skipped: "geen reviewlink ingesteld" });
  }

  const dayStart = new Date(Date.now() - DAYS_AFTER_DELIVERY * 86400000);
  dayStart.setUTCHours(0, 0, 0, 0);
  const dayEnd = new Date(dayStart.getTime() + 86400000);

  const { data: projects } = await admin
    .from("projects")
    .select("id, client_id")
    .not("delivery_signed_at", "is", null)
    .not("client_id", "is", null)
    .is("review_request_sent_at", null)
    .gte("delivery_signed_at", dayStart.toISOString())
    .lt("delivery_signed_at", dayEnd.toISOString());

  let sent = 0;
  for (const p of projects ?? []) {
    const projectId = p.id as string;
    const recipients = await getProjectClientUserIds(projectId);
    if (recipients.length) {
      await sendPushToUsers(recipients, {
        title: "Bedankt voor het vertrouwen!",
        body: "Zou je ons willen helpen met een review? Dat kost je maar een minuutje.",
        url: "/api/review",
      });
      sent++;
    }
    await admin.from("projects").update({ review_request_sent_at: new Date().toISOString() }).eq("id", projectId);
  }

  return NextResponse.json({ ok: true, sent });
}
