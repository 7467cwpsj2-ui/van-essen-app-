import { ShieldCheck } from "lucide-react";
import { requireOwner } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getInviteStatuses } from "@/lib/inviteStatus";
import { TeamMemberRow } from "@/components/TeamMemberRow";
import { InviteTeamForm } from "@/components/InviteTeamForm";
import type { InviteStatus } from "@/lib/inviteStatus";
import type { Project, TeamMember } from "@/types/database";

export default async function PersoneelPage() {
  await requireOwner();
  const supabase = createClient();

  const [{ data: members }, { data: projects }, { data: accessRows }, { data: profiles }] = await Promise.all([
    supabase.from("team_members").select("*").order("name"),
    supabase.from("projects").select("id,name").order("name"),
    supabase.from("project_team_access").select("team_member_id,project_id"),
    supabase.from("profiles").select("id,team_member_id").not("team_member_id", "is", null),
  ]);

  const accessByMember: Record<string, string[]> = {};
  (accessRows ?? []).forEach((row) => {
    accessByMember[row.team_member_id] = accessByMember[row.team_member_id] || [];
    accessByMember[row.team_member_id].push(row.project_id);
  });

  const profileByMemberId: Record<string, string> = {};
  (profiles ?? []).forEach((p) => {
    if (p.team_member_id) profileByMemberId[p.team_member_id as string] = p.id as string;
  });
  const inviteStatuses = await getInviteStatuses(Object.values(profileByMemberId));
  const inviteStatusByMemberId: Record<string, InviteStatus> = {};
  Object.entries(profileByMemberId).forEach(([memberId, profileId]) => {
    if (inviteStatuses[profileId]) inviteStatusByMemberId[memberId] = inviteStatuses[profileId];
  });

  const teamMembers = (members ?? []) as TeamMember[];
  const projectList = ((projects ?? []) as Pick<Project, "id" | "name">[]).map((p) => ({ id: p.id, name: p.name }));

  const ownStaff = teamMembers.filter((m) => m.member_type === "personeel");
  const contractors = teamMembers.filter((m) => m.member_type !== "personeel");

  return (
    <div className="panel access-panel">
      <div className="header-eyebrow">Beheer</div>
      <h1 className="page-title">Personeel</h1>
      <div className="hint-bar">
        <ShieldCheck size={14} style={{ display: "inline", marginRight: 6, verticalAlign: -2 }} />
        Iedereen logt in met zijn eigen e-mailadres en ziet alleen de onderdelen en projecten die je hier vrijgeeft. Kies bij het
        uitnodigen (of later) of iemand eigen personeel of team/onderaannemer is.
      </div>

      <div className="access-block">
        <div className="access-block-title">Van Essen Bouw & Onderhoud — eigen personeel</div>
        {ownStaff.length === 0 && <div className="empty-hint">Nog geen eigen personeel toegevoegd.</div>}
        <div className="access-list">
          {ownStaff.map((m) => (
            <TeamMemberRow
              key={m.id}
              member={m}
              projects={projectList}
              access={accessByMember[m.id] || []}
              inviteStatus={inviteStatusByMemberId[m.id]}
            />
          ))}
        </div>
      </div>

      <div className="access-block">
        <div className="access-block-title">Team &amp; onderaannemers</div>
        {contractors.length === 0 && <div className="empty-hint">Nog geen team/onderaannemers toegevoegd.</div>}
        <div className="access-list">
          {contractors.map((m) => (
            <TeamMemberRow
              key={m.id}
              member={m}
              projects={projectList}
              access={accessByMember[m.id] || []}
              inviteStatus={inviteStatusByMemberId[m.id]}
            />
          ))}
        </div>
      </div>

      <InviteTeamForm />
    </div>
  );
}
