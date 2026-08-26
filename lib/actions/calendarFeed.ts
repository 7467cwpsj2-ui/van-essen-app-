"use server";

import { randomUUID } from "crypto";
import { revalidatePath } from "next/cache";
import { requireUser, type CurrentUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

const siteUrl = () => process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

// Iedereen mag alleen zijn eigen agenda-link opvragen/intrekken — nooit
// die van een ander. Voor team is dat de gekoppelde team_member_id, voor
// de eigenaar (die geen team_member_id mag hebben) de eigen-personeel-
// koppeling uit migratie 0061.
function myTeamMemberId(current: CurrentUser): string | null {
  if (current.profile.role === "team") return current.profile.team_member_id;
  return current.ownStaffMember?.id ?? null;
}

export async function getOrCreateCalendarFeedUrl(): Promise<string> {
  const current = await requireUser();
  const teamMemberId = myTeamMemberId(current);
  if (!teamMemberId) throw new Error("Geen personeelskoppeling gevonden.");

  const supabase = createClient();
  const { data: existing } = await supabase.from("team_members").select("calendar_token").eq("id", teamMemberId).single();
  let token = existing?.calendar_token as string | null | undefined;
  if (!token) {
    token = randomUUID();
    const { error } = await supabase.from("team_members").update({ calendar_token: token }).eq("id", teamMemberId);
    if (error) throw new Error(error.message);
    revalidatePath("/dashboard");
  }
  return `${siteUrl()}/api/agenda/${token}`;
}

export async function revokeCalendarFeed(): Promise<void> {
  const current = await requireUser();
  const teamMemberId = myTeamMemberId(current);
  if (!teamMemberId) throw new Error("Geen personeelskoppeling gevonden.");

  const supabase = createClient();
  const { error } = await supabase.from("team_members").update({ calendar_token: null }).eq("id", teamMemberId);
  if (error) throw new Error(error.message);
  revalidatePath("/dashboard");
}
