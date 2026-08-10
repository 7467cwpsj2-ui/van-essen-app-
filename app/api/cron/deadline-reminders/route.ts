import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getOwnerUserIds, getProjectClientUserIds, getProjectInternalUserIds, getProjectName, getTeamMemberUserIds, sendPushToUsers } from "@/lib/push";

export const dynamic = "force-dynamic";

// Draait dagelijks (zie vercel.json) en stuurt een pushmelding voor elk
// te-doen en opleverpunt met een deadline morgen, zodat iemand niet pas
// ná het verstrijken ervan ziet dat het rood is geworden.
export async function GET(request: Request) {
  if (process.env.CRON_SECRET) {
    const authHeader = request.headers.get("authorization");
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return new NextResponse("Unauthorized", { status: 401 });
    }
  }

  const admin = createAdminClient();
  const tomorrow = new Date(Date.now() + 86400000).toISOString().slice(0, 10);

  const projectNameCache = new Map<string, string>();
  const nameFor = async (projectId: string) => {
    if (!projectNameCache.has(projectId)) projectNameCache.set(projectId, await getProjectName(projectId));
    return projectNameCache.get(projectId)!;
  };

  const [{ data: tasks }, { data: points }] = await Promise.all([
    admin
      .from("tasks")
      .select("id,project_id,title,assignee_type,assignee_team_member_ids")
      .eq("due_date", tomorrow)
      .eq("done", false),
    admin
      .from("completion_points")
      .select("id,project_id,description,responsible_team_member_id")
      .eq("deadline", tomorrow)
      .neq("status", "goedgekeurd"),
  ]);

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
        title: `Deadline morgen — ${projectName}`,
        body: t.title as string,
        url: `/projects/${projectId}/planning`,
      });
      tasksNotified++;
    }
  }

  let pointsNotified = 0;
  for (const p of points ?? []) {
    const projectId = p.project_id as string;
    const responsible = p.responsible_team_member_id ? await getTeamMemberUserIds(p.responsible_team_member_id as string) : [];
    const owners = await getOwnerUserIds();
    const recipients = Array.from(new Set([...owners, ...responsible]));
    if (recipients.length) {
      const projectName = await nameFor(projectId);
      await sendPushToUsers(recipients, {
        title: `Opleverpunt-deadline morgen — ${projectName}`,
        body: p.description as string,
        url: `/projects/${projectId}/opleverpunten`,
      });
      pointsNotified++;
    }
  }

  return NextResponse.json({ ok: true, tasksNotified, pointsNotified });
}
