import "server-only";
import webpush from "web-push";
import { createAdminClient } from "@/lib/supabase/admin";

const VAPID_PUBLIC = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
const VAPID_PRIVATE = process.env.VAPID_PRIVATE_KEY;

if (VAPID_PUBLIC && VAPID_PRIVATE) {
  try {
    webpush.setVapidDetails(
      process.env.VAPID_SUBJECT || "mailto:info@vanessenbouwenonderhoud.nl",
      VAPID_PUBLIC,
      VAPID_PRIVATE
    );
  } catch {
    // Ongeldige sleutels mogen de app nooit laten crashen — pushmeldingen
    // blijven dan gewoon uit totdat de sleutels kloppen.
  }
}

export interface PushPayload {
  title: string;
  body: string;
  url?: string;
}

// Verstuurt een pushmelding naar alle geregistreerde toestellen van de
// gegeven gebruiker(s), én bewaart 'm altijd ook in het meldingencentrum
// (notifications-tabel) — dat werkt onafhankelijk van push, dus een
// gemiste of nooit-geconfigureerde pushmelding blijft gewoon in de app
// zelf zichtbaar. Dit alles is best-effort en mag nooit de aanroepende
// actie laten falen.
export async function sendPushToUsers(userIds: string[], payload: PushPayload) {
  if (userIds.length === 0) return;
  const admin = createAdminClient();

  try {
    await admin
      .from("notifications")
      .insert(userIds.map((user_id) => ({ user_id, title: payload.title, body: payload.body, url: payload.url ?? null })));
  } catch {
    // meldingencentrum is best-effort, mag verzenden van push nooit blokkeren
  }

  if (!VAPID_PUBLIC || !VAPID_PRIVATE) return;
  try {
    const { data: subs } = await admin.from("push_subscriptions").select("*").in("user_id", userIds);
    if (!subs?.length) return;

    await Promise.all(
      subs.map(async (sub) => {
        try {
          await webpush.sendNotification(
            { endpoint: sub.endpoint as string, keys: { p256dh: sub.p256dh as string, auth: sub.auth_key as string } },
            JSON.stringify(payload)
          );
        } catch (err) {
          const statusCode = (err as { statusCode?: number })?.statusCode;
          if (statusCode === 404 || statusCode === 410) {
            await admin.from("push_subscriptions").delete().eq("id", sub.id as string);
          }
        }
      })
    );
  } catch {
    // Pushmeldingen zijn best-effort — nooit de eigenlijke actie breken.
  }
}

export async function sendPushToUser(userId: string, payload: PushPayload) {
  return sendPushToUsers([userId], payload);
}

// ---------- doelgroep-helpers: van rol/koppeling naar auth user-id's ----------

export async function getOwnerUserIds(excludeUserId?: string | null): Promise<string[]> {
  const admin = createAdminClient();
  const { data } = await admin.from("profiles").select("id").eq("role", "eigenaar");
  return (data ?? []).map((p) => p.id as string).filter((id) => id !== excludeUserId);
}

export async function getClientUserIds(clientId: string, excludeUserId?: string | null): Promise<string[]> {
  const admin = createAdminClient();
  const { data } = await admin.from("profiles").select("id").eq("client_id", clientId);
  return (data ?? []).map((p) => p.id as string).filter((id) => id !== excludeUserId);
}

export async function getTeamMemberUserIds(teamMemberId: string, excludeUserId?: string | null): Promise<string[]> {
  const admin = createAdminClient();
  const { data } = await admin.from("profiles").select("id").eq("team_member_id", teamMemberId);
  return (data ?? []).map((p) => p.id as string).filter((id) => id !== excludeUserId);
}

export async function getProjectClientUserIds(projectId: string, excludeUserId?: string | null): Promise<string[]> {
  const admin = createAdminClient();
  const [{ data: project }, { data: extra }] = await Promise.all([
    admin.from("projects").select("client_id").eq("id", projectId).single(),
    admin.from("project_client_access").select("client_id").eq("project_id", projectId),
  ]);
  const clientIds = new Set<string>();
  if (project?.client_id) clientIds.add(project.client_id as string);
  (extra ?? []).forEach((r) => clientIds.add(r.client_id as string));
  if (clientIds.size === 0) return [];
  const lists = await Promise.all(Array.from(clientIds).map((id) => getClientUserIds(id, excludeUserId)));
  return Array.from(new Set(lists.flat()));
}

async function getAccessibleTeamMemberIds(projectId: string): Promise<string[]> {
  const admin = createAdminClient();
  const [{ data: teamMembers }, { data: explicitAccess }] = await Promise.all([
    admin.from("team_members").select("id, sees_all_projects"),
    admin.from("project_team_access").select("team_member_id").eq("project_id", projectId),
  ]);
  const explicitIds = new Set((explicitAccess ?? []).map((a) => a.team_member_id as string));
  return (teamMembers ?? [])
    .filter((tm) => tm.sees_all_projects || explicitIds.has(tm.id as string))
    .map((tm) => tm.id as string);
}

// Eigenaar + teamleden met toegang tot dit project (geen klant) — voor
// bijvoorbeeld notities met zichtbaarheid 'team'.
export async function getProjectInternalUserIds(projectId: string, excludeUserId?: string | null): Promise<string[]> {
  const admin = createAdminClient();
  const ids = new Set<string>();

  const { data: owners } = await admin.from("profiles").select("id").eq("role", "eigenaar");
  owners?.forEach((p) => ids.add(p.id as string));

  const teamMemberIds = await getAccessibleTeamMemberIds(projectId);
  if (teamMemberIds.length) {
    const { data: teamProfiles } = await admin.from("profiles").select("id").in("team_member_id", teamMemberIds);
    teamProfiles?.forEach((p) => ids.add(p.id as string));
  }

  if (excludeUserId) ids.delete(excludeUserId);
  return Array.from(ids);
}

// Iedereen met toegang tot een project: eigenaar, teamleden met
// toegang, en de gekoppelde klant.
export async function getProjectParticipantUserIds(projectId: string, excludeUserId?: string | null): Promise<string[]> {
  const internal = await getProjectInternalUserIds(projectId, excludeUserId);
  const clientIds = await getProjectClientUserIds(projectId, excludeUserId);
  return Array.from(new Set([...internal, ...clientIds]));
}

export async function getProjectName(projectId: string): Promise<string> {
  const admin = createAdminClient();
  const { data } = await admin.from("projects").select("name").eq("id", projectId).single();
  return (data?.name as string) ?? "Van Essen";
}
