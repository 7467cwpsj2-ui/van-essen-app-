import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getTeamMemberUserIds, sendPushToUsers } from "@/lib/push";

export const dynamic = "force-dynamic";

// Draait dagelijks rond 16:30 NL-tijd (zie vercel.json) en herinnert
// eigen personeel (member_type = 'personeel', dus geen onderaannemers)
// dat nog geen uren voor vandaag geregistreerd staan — op geen enkel
// project.
export async function GET(request: Request) {
  if (process.env.CRON_SECRET) {
    const authHeader = request.headers.get("authorization");
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return new NextResponse("Unauthorized", { status: 401 });
    }
  }

  const admin = createAdminClient();
  const todayIso = new Date().toISOString().slice(0, 10);

  const [{ data: staff }, { data: hoursToday }] = await Promise.all([
    admin.from("team_members").select("id").eq("member_type", "personeel"),
    admin.from("hours").select("team_member_id").eq("work_date", todayIso),
  ]);

  const loggedToday = new Set((hoursToday ?? []).map((h) => h.team_member_id as string));

  let notified = 0;
  for (const member of staff ?? []) {
    const id = member.id as string;
    if (loggedToday.has(id)) continue;
    const recipients = await getTeamMemberUserIds(id);
    if (recipients.length) {
      await sendPushToUsers(recipients, {
        title: "Uren van vandaag al ingevuld?",
        body: "Vergeet niet je uren van vandaag te registreren.",
        url: "/dashboard",
      });
      notified++;
    }
  }

  return NextResponse.json({ ok: true, notified });
}
