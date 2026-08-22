import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

export interface InviteStatus {
  pending: boolean;
  email: string | null;
}

// Voor een lijst profiles.id's (= auth-user-id's) ophalen of de
// uitnodiging al geaccepteerd is (e-mail bevestigd) of nog open staat —
// bv. omdat de link inmiddels verlopen is. Gebruikt om bij Klanten en
// Personeel te tonen wie er nog "opnieuw uitgenodigd" kan worden.
export async function getInviteStatuses(profileIds: string[]): Promise<Record<string, InviteStatus>> {
  if (profileIds.length === 0) return {};
  const admin = createAdminClient();
  const entries = await Promise.all(
    profileIds.map(async (id) => {
      const { data } = await admin.auth.admin.getUserById(id);
      const user = data?.user;
      return [id, { pending: !user?.email_confirmed_at, email: user?.email ?? null }] as [string, InviteStatus];
    })
  );
  return Object.fromEntries(entries);
}
