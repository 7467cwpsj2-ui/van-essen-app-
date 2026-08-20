import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getOwnerUserIds, getProjectClientUserIds, getProjectInternalUserIds, getProjectName, getTeamMemberUserIds, sendPushToUsers } from "@/lib/push";

export const dynamic = "force-dynamic";

// Vercel Cron kent geen tijdzones (alleen UTC), en NL wisselt tussen
// zomer- en wintertijd. Om dit toch echt om 10:00 NL-tijd te laten
// afgaan, roept vercel.json deze route op twee UTC-uren per dag aan
// ("0 8,9 * * *" — één die in de zomer klopt, één die in de winter),
// hier wordt gecontroleerd of het daadwerkelijk 10 uur NL-tijd is; het
// verkeerde moment van de twee doet dan gewoon niets. Zelfde patroon als
// de uren-herinnering.
function isTargetHourInAmsterdam(): boolean {
  const hour = new Intl.DateTimeFormat("nl-NL", { timeZone: "Europe/Amsterdam", hour: "2-digit", hour12: false }).format(new Date());
  return Number(hour) === 10;
}

// Draait dagelijks rond 10:00 NL-tijd (zie vercel.json) en stuurt een
// pushmelding voor elk te-doen dat vandaag gepland staat — naar wie het
// item ook toegewezen is (eigenaar, team of klant), zodat niemand het
// vergeet. Bewust los van de "deadline morgen"-cron, die om 06:00 blijft
// draaien (te vroeg voor deze herinnering).
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
  const today = new Date().toISOString().slice(0, 10);

  const projectNameCache = new Map<string, string>();
  const nameFor = async (projectId: string) => {
    if (!projectNameCache.has(projectId)) projectNameCache.set(projectId, await getProjectName(projectId));
    return projectNameCache.get(projectId)!;
  };

  const { data: tasks } = await admin
    .from("tasks")
    .select("id,project_id,title,assignee_type,assignee_team_member_ids")
    .eq("due_date", today)
    .eq("done", false);

  let tasksNotified = 0;
  for (const t of tasks ?? []) {
    const projectId = t.project_id as string;
    let recipients: string[] = [];
    if (t.assignee_type === "eigenaar") {
      recipients = await getOwnerUserIds();
    } else if (t.assignee_type === "klant") {
      recipients = await getProjectClientUserIds(projectId);
    } else if (t.assignee_type === "team") {
      const ids = (t.assignee_team_member_ids as string[]) ?? [];
      if (ids.length > 0) {
        const lists = await Promise.all(ids.map((id) => getTeamMemberUserIds(id)));
        recipients = Array.from(new Set(lists.flat()));
      } else {
        recipients = await getProjectInternalUserIds(projectId);
      }
    }
    if (recipients.length) {
      const projectName = await nameFor(projectId);
      await sendPushToUsers(recipients, {
        title: `Te doen vandaag — ${projectName}`,
        body: t.title as string,
        url: `/projects/${projectId}/planning`,
      });
      tasksNotified++;
    }
  }

  return NextResponse.json({ ok: true, tasksNotified });
}
