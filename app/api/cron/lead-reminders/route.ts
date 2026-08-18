import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getOwnerUserIds, sendPushToUsers } from "@/lib/push";

export const dynamic = "force-dynamic";

// Draait dagelijks (zie vercel.json) en herinnert de eigenaar aan een
// offerte die na een locatiebezoek nog niet verstuurd is — blijft
// terugkomen elke `lead_reminder_days` dagen totdat de status van de
// aanvraag verandert (zie updateLeadStatus, die last_reminder_sent_at
// terugzet naar null).
export async function GET(request: Request) {
  if (process.env.CRON_SECRET) {
    const authHeader = request.headers.get("authorization");
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return new NextResponse("Unauthorized", { status: 401 });
    }
  }

  const admin = createAdminClient();
  const { data: settings } = await admin.from("app_settings").select("lead_reminder_days").eq("id", true).single();
  const reminderDays = (settings?.lead_reminder_days as number | undefined) ?? 3;
  const cutoffDate = new Date(Date.now() - reminderDays * 86400000).toISOString().slice(0, 10);
  const repeatCutoff = Date.now() - reminderDays * 86400000;

  const { data: leads } = await admin
    .from("leads")
    .select("id,client_name,visit_date,last_reminder_sent_at")
    .eq("status", "open")
    .not("visit_date", "is", null)
    .lte("visit_date", cutoffDate);

  const owners = await getOwnerUserIds();
  let notified = 0;
  for (const l of leads ?? []) {
    const last = l.last_reminder_sent_at as string | null;
    if (last && new Date(last).getTime() > repeatCutoff) continue;
    if (owners.length) {
      await sendPushToUsers(owners, {
        title: "Nog geen offerte verstuurd",
        body: `${l.client_name} — bezoek was op ${l.visit_date}.`,
        url: "/offertes",
      });
      notified++;
    }
    await admin.from("leads").update({ last_reminder_sent_at: new Date().toISOString() }).eq("id", l.id as string);
  }

  return NextResponse.json({ ok: true, notified });
}
