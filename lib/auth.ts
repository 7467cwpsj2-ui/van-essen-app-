import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import type { Client, ModuleKey, Profile, TeamMember } from "@/types/database";
import { redirect } from "next/navigation";

export interface CurrentUser {
  id: string;
  profile: Profile;
  teamMember: TeamMember | null;
  client: Client | null;
  // Voor een eigenaar die zichzelf ook als eigen personeel heeft
  // toegevoegd (zie migratie 0061) — de team_members-rij die hij
  // gebruikt om zichzelf in te plannen, uren op te registreren en
  // pushmeldingen te krijgen als personeel. Blijft null voor team/klant
  // (die gebruiken teamMember/client hierboven) en voor een eigenaar die
  // zichzelf nog niet heeft toegevoegd.
  ownStaffMember: TeamMember | null;
}

// Haalt de ingelogde gebruiker + bijbehorend profiel op. RLS zorgt dat
// een gebruiker altijd zijn eigen profiel/team-/klantrecord mag lezen.
// Wordt zowel in de root-layout als in de (geneste) project-layout als
// in vrijwel elke pagina zelf aangeroepen — cache() zorgt dat dat
// binnen één paginalading maar één keer echt draait, inclusief het
// netwerk-rondje naar Supabase Auth (auth.getUser()), i.p.v. dat elke
// laag dat opnieuw doet.
export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
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

  let ownStaffMember: TeamMember | null = null;
  if (profile.role === "eigenaar") {
    const { data } = await supabase.from("team_members").select("*").eq("owner_profile_id", user.id).maybeSingle();
    ownStaffMember = data ?? null;
  }

  return { id: user.id, profile, teamMember, client, ownStaffMember };
});

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

// Voor de kleine, niet-goedkeuring-plichtige acties in de algemene
// planning (gereed afvinken, kleur aanpassen) — de eigenaar mag dit
// altijd, een teamlid alleen met expliciete "wijzigen"-toegang. Echte
// planningswijzigingen (nieuwe/andere klus, bezetting) lopen niet via
// deze check, maar via de voorstel-acties in lib/actions/planningRequests.ts.
export async function requirePlanningEditAccess(): Promise<CurrentUser> {
  const current = await requireUser();
  const allowed =
    current.profile.role === "eigenaar" ||
    (current.profile.role === "team" && current.teamMember?.planning_overzicht_access === "wijzigen");
  if (!allowed) redirect("/dashboard");
  return current;
}

// Cliëntzijdige spiegel van has_module_access() uit de SQL-migratie —
// alleen voor UI-beslissingen (tonen/verbergen). De database-RLS is de
// echte grens, dit voorkomt alleen onnodige flitsen van UI die toch
// zou falen.
export function canSeeModule(current: CurrentUser, moduleKey: ModuleKey): boolean {
  if (current.profile.role === "eigenaar") return true;
  // Meer-/minderwerk is een harde regel: nooit voor team, geen toggle.
  if (current.profile.role === "team") return moduleKey !== "meerwerk" && (current.teamMember?.permissions?.[moduleKey] ?? true);
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

// Uren: harde regel, altijd intern (eigenaar + team), nooit klant. Geen
// module-toggle.
export function canSeeHours(current: CurrentUser): boolean {
  return current.profile.role === "eigenaar" || current.profile.role === "team";
}

// Nacalculatie: alleen de eigenaar.
export function canSeeCalc(current: CurrentUser): boolean {
  return current.profile.role === "eigenaar";
}

// Subsidiemodule: harde regel, alleen de eigenaar — team en klant komen
// hier niet bij. Geen module-toggle.
export function canSeeSubsidies(current: CurrentUser): boolean {
  return current.profile.role === "eigenaar";
}
