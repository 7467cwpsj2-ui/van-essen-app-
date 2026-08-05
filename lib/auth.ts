import { createClient } from "@/lib/supabase/server";
import type { Client, ModuleKey, Profile, TeamMember } from "@/types/database";
import { redirect } from "next/navigation";

export interface CurrentUser {
  id: string;
  profile: Profile;
  teamMember: TeamMember | null;
  client: Client | null;
}

// Haalt de ingelogde gebruiker + bijbehorend profiel op. RLS zorgt dat
// een gebruiker altijd zijn eigen profiel/team-/klantrecord mag lezen.
export async function getCurrentUser(): Promise<CurrentUser | null> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).single();
  if (!profile) return null;

  let teamMember: TeamMember | null = null;
  let client: Client | null = null;

  if (profile.team_member_id) {
    const { data } = await supabase.from("team_members").select("*").eq("id", profile.team_member_id).single();
    teamMember = data ?? null;
  }
  if (profile.client_id) {
    const { data } = await supabase.from("clients").select("*").eq("id", profile.client_id).single();
    client = data ?? null;
  }

  return { id: user.id, profile, teamMember, client };
}

export async function requireUser(): Promise<CurrentUser> {
  const current = await getCurrentUser();
  if (!current) redirect("/login");
  return current;
}

export async function requireOwner(): Promise<CurrentUser> {
  const current = await requireUser();
  if (current.profile.role !== "eigenaar") redirect("/dashboard");
  return current;
}

// Cliëntzijdige spiegel van has_module_access() uit de SQL-migratie —
// alleen voor UI-beslissingen (tonen/verbergen). De database-RLS is de
// echte grens, dit voorkomt alleen onnodige flitsen van UI die toch
// zou falen.
export function canSeeModule(current: CurrentUser, moduleKey: ModuleKey): boolean {
  if (current.profile.role === "eigenaar") return true;
  if (current.profile.role === "team") return current.teamMember?.permissions?.[moduleKey] ?? true;
  if (current.profile.role === "klant") return current.client?.permissions?.[moduleKey] ?? true;
  return false;
}

export function canEditSchedule(current: CurrentUser): boolean {
  if (current.profile.role === "eigenaar") return true;
  if (current.profile.role === "team") return current.teamMember?.can_edit_schedule ?? false;
  if (current.profile.role === "klant") return current.client?.can_edit_schedule ?? false;
  return false;
}

// Privéchat eigenaar-klant: harde regel, geen toggle — team komt hier
// nooit bij, net zoals uren/veiligheid dat straks zullen zijn.
export function canSeePrivateChat(current: CurrentUser): boolean {
  return current.profile.role === "eigenaar" || current.profile.role === "klant";
}
