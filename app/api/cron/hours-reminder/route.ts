import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getTeamMemberUserIds, sendPushToUsers } from "@/lib/push";

export const dynamic = "force-dynamic";

// Vercel Cron kent geen tijdzones (alleen UTC), en NL wisselt tussen
// zomer- en wintertijd. Om dit toch echt om 16:30 NL-tijd te laten
// afgaan, roept vercel.json deze route op twee UTC-tijden per dag aan
// (één die in de zomer klopt, één die in de winter klopt) — hier wordt
// vervolgens gecontroleerd of het daadwerkelijk 16 uur NL-tijd is; het
// verkeerde moment van de twee doet dan gewoon niets.
function isTargetHourInAmsterdam(): boolean {
  const hour = new Intl.DateTimeFormat("nl-NL", { timeZone: "Europe/Amsterdam", hour: "2-digit", hour12: false }).format(new Date());
  return Number(hour) === 16;
}

// Draait doordeweeks rond 16:30 NL-tijd (zie vercel.json) en herinnert
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

  if (!isTargetHourInAmsterdam()) {
    return NextResponse.json({ ok: true, skipped: "niet het juiste NL-tijdstip (zomer/wintertijd-check)" });
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
