import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getTeamMemberUserIds, sendPushToUsers } from "@/lib/push";
import type { QuickJobDayAssignment } from "@/types/database";

export const dynamic = "force-dynamic";

// Vercel Cron kent geen tijdzones (alleen UTC), en NL wisselt tussen
// zomer- en wintertijd. Om dit toch echt om 06:30 NL-tijd te laten
// afgaan, roept vercel.json deze route op twee UTC-uren per dag aan
// binnen dezelfde cron-regel ("30 4,5 * * *" — één die in de zomer
// klopt, één die in de winter), hier wordt vervolgens gecontroleerd of
// het daadwerkelijk 6 uur NL-tijd is; het verkeerde moment van de twee
// doet dan gewoon niets. Zelfde patroon als de andere reminder-crons.
function isTargetHourInAmsterdam(): boolean {
  const hour = new Intl.DateTimeFormat("nl-NL", { timeZone: "Europe/Amsterdam", hour: "2-digit", hour12: false }).format(new Date());
  return Number(hour) === 6;
}

function truncate(text: string, max = 120) {
  return text.length > max ? text.slice(0, max - 1) + "…" : text;
}

// Draait dagelijks rond 06:30 NL-tijd (zie vercel.json) en herinnert
// iedereen die vandaag op een losse klus staat ingepland eraan — mét
// een tik-door naar de klus zelf, zodat het adres/de route en de
// omschrijving van de werkzaamheden meteen bij de hand zijn. Bij een
// klus met dag-voor-dag verdeling (day_assignments) gaat de melding
// alleen naar wie vandáág specifiek is ingepland, niet naar iedereen
// die ooit op de klus staat.
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

  const { data: jobs } = await admin
    .from("quick_jobs")
    .select("id,title,address,description,day_assignments,assignee_team_member_ids")
    .lte("start_date", todayIso)
    .gte("end_date", todayIso)
    .eq("done", false)
    .eq("kind", "klus");

  let notified = 0;
  for (const job of jobs ?? []) {
    const dayAssignments = job.day_assignments as QuickJobDayAssignment[] | null;
    const memberIds =
      dayAssignments && dayAssignments.length > 0
        ? dayAssignments.find((d) => d.date === todayIso)?.team_member_ids ?? []
        : (job.assignee_team_member_ids as string[]);
    if (!memberIds || memberIds.length === 0) continue;

    const lists = await Promise.all(memberIds.map((id) => getTeamMemberUserIds(id)));
    const recipients = Array.from(new Set(lists.flat()));
    if (recipients.length === 0) continue;

    const address = job.address as string | null;
    const description = job.description as string | null;
    await sendPushToUsers(recipients, {
      title: `Vandaag: ${job.title as string}`,
      body: address ? address : description ? truncate(description) : "Bekijk de klus en de route.",
      url: `/klussen/${job.id}`,
    });
    notified++;
  }

  return NextResponse.json({ ok: true, notified });
}
