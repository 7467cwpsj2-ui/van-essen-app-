import { ShieldCheck } from "lucide-react";
import { requireOwner } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { TeamMemberRow } from "@/components/TeamMemberRow";
import { InviteTeamForm } from "@/components/InviteTeamForm";
import type { Project, TeamMember } from "@/types/database";

export default async function TeamPage() {
  await requireOwner();
  const supabase = createClient();

  const [{ data: members }, { data: projects }, { data: accessRows }] = await Promise.all([
    supabase.from("team_members").select("*").order("name"),
    supabase.from("projects").select("id,name").order("name"),
    supabase.from("project_team_access").select("team_member_id,project_id"),
  ]);

  const accessByMember: Record<string, string[]> = {};
  (accessRows ?? []).forEach((row) => {
    accessByMember[row.team_member_id] = accessByMember[row.team_member_id] || [];
    accessByMember[row.team_member_id].push(row.project_id);
  });

  const teamMembers = (members ?? []) as TeamMember[];
  const projectList = ((projects ?? []) as Pick<Project, "id" | "name">[]).map((p) => ({ id: p.id, name: p.name }));

  return (
    <div className="panel access-panel">
      <div className="hint-bar">
        <ShieldCheck size={14} style={{ display: "inline", marginRight: 6, verticalAlign: -2 }} />
        Teamleden loggen in met hun eigen e-mailadres. Ze zien alleen de onderdelen en projecten die je hier vrijgeeft.
      </div>

      <div className="access-block">
        <div className="access-block-title">Team</div>
        {teamMembers.length === 0 && <div className="empty-hint">Nog geen teamleden uitgenodigd.</div>}
        <div className="access-list">
          {teamMembers.map((m) => (
            <TeamMemberRow key={m.id} member={m} projects={projectList} access={accessByMember[m.id] || []} />
          ))}
        </div>
      </div>

      <InviteTeamForm />
    </div>
  );
}
