import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getOwnerUserIds, getProjectClientUserIds, getProjectInternalUserIds, getProjectName, getTeamMemberUserIds, sendPushToUsers } from "@/lib/push";

export const dynamic = "force-dynamic";

// Draait dagelijks om 06:00 (zie vercel.json) en stuurt een pushmelding
// voor elk te-doen dat vandaag gepland staat (zodat je het niet vergeet)
// en voor elk te-doen/opleverpunt met een deadline morgen (zodat iemand
// niet pas ná het verstrijken ervan ziet dat het rood is geworden).
export async function GET(request: Request) {
  if (process.env.CRON_SECRET) {
    const authHeader = request.headers.get("authorization");
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return new NextResponse("Unauthorized", { status: 401 });
    }
  }

  const admin = createAdminClient();
  const today = new Date().toISOString().slice(0, 10);
  const tomorrow = new Date(Date.now() + 86400000).toISOString().slice(0, 10);

  const projectNameCache = new Map<string, string>();
  const nameFor = async (projectId: string) => {
    if (!projectNameCache.has(projectId)) projectNameCache.set(projectId, await getProjectName(projectId));
    return projectNameCache.get(projectId)!;
  };

  const resolveTaskRecipients = async (t: { project_id: string; assignee_type: string; assignee_team_member_ids: string[] | null }) => {
    if (t.assignee_type === "eigenaar") return getOwnerUserIds();
    if (t.assignee_type === "klant") return getProjectClientUserIds(t.project_id);
    if (t.assignee_type === "team") {
      const ids = t.assignee_team_member_ids ?? [];
      if (ids.length > 0) {
        const lists = await Promise.all(ids.map((id) => getTeamMemberUserIds(id)));
        return Array.from(new Set(lists.flat()));
      }
      return getProjectInternalUserIds(t.project_id);
    }
    return [];
  };

  const [{ data: tasksToday }, { data: tasksTomorrow }, { data: points }] = await Promise.all([
    admin
      .from("tasks")
      .select("id,project_id,title,assignee_type,assignee_team_member_ids")
      .eq("due_date", today)
      .eq("done", false),
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

  let tasksTodayNotified = 0;
  for (const t of tasksToday ?? []) {
    const projectId = t.project_id as string;
    const recipients = await resolveTaskRecipients(t as { project_id: string; assignee_type: string; assignee_team_member_ids: string[] | null });
    if (recipients.length) {
      const projectName = await nameFor(projectId);
      await sendPushToUsers(recipients, {
        title: `Te doen vandaag — ${projectName}`,
        body: t.title as string,
        url: `/projects/${projectId}/planning`,
      });
      tasksTodayNotified++;
    }
  }

  let tasksNotified = 0;
  for (const t of tasksTomorrow ?? []) {
    const projectId = t.project_id as string;
    const recipients = await resolveTaskRecipients(t as { project_id: string; assignee_type: string; assignee_team_member_ids: string[] | null });
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

  return NextResponse.json({ ok: true, tasksTodayNotified, tasksNotified, pointsNotified });
}
