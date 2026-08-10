import { canSeeModule, requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { NotesPanel } from "@/components/NotesPanel";
import type { Note, TeamMember } from "@/types/database";

export default async function NotitiesPage({ params }: { params: { id: string } }) {
  const current = await requireUser();
  if (!canSeeModule(current, "notities")) {
    return <div className="empty-hint">Je hebt geen toegang tot deze module.</div>;
  }

  const supabase = createClient();
  const [{ data: notes }, { data: teamMembers }] = await Promise.all([
    supabase.from("notes").select("*").eq("project_id", params.id).order("created_at", { ascending: false }),
    current.profile.role !== "klant" ? supabase.from("team_members").select("*").order("name") : Promise.resolve({ data: [] }),
  ]);

  return (
    <NotesPanel
      projectId={params.id}
      role={current.profile.role}
      currentUserId={current.id}
      currentTeamMemberId={current.profile.team_member_id}
      notes={(notes ?? []) as Note[]}
      teamMembers={((teamMembers ?? []) as TeamMember[]).map((m) => ({ id: m.id, name: m.name }))}
    />
  );
}
