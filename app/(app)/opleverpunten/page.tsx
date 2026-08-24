import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { canSeeModule, requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { CompletionPointsPanel, type CompletionPointWithPhoto } from "@/components/CompletionPointsPanel";
import type { CompletionPoint, TeamMember } from "@/types/database";

export default async function AlleOpleverpuntenPage() {
  const current = await requireUser();
  if (!canSeeModule(current, "opleverpunten")) {
    return <div className="empty-hint">Je hebt geen toegang tot deze module.</div>;
  }

  const supabase = createClient();
  const [{ data: projects }, { data: teamMembers }] = await Promise.all([
    supabase.from("projects").select("id,name,delivery_signed_at").order("name"),
    supabase.from("team_members").select("*").order("name"),
  ]);

  const teamMemberOptions = ((teamMembers ?? []) as TeamMember[]).map((m) => ({ id: m.id, name: m.name }));

  const sections = await Promise.all(
    (projects ?? []).map(async (p) => {
      const { data: points } = await supabase
        .from("completion_points")
        .select("*")
        .eq("project_id", p.id)
        .neq("status", "goedgekeurd")
        .order("created_at");
      const rows = (points ?? []) as CompletionPoint[];
      const withPhotos: CompletionPointWithPhoto[] = await Promise.all(
        rows.map(async (point) => {
          let photoUrl: string | null = null;
          if (point.photo_path) {
            const { data } = await supabase.storage.from("project-files").createSignedUrl(point.photo_path, 3600);
            photoUrl = data?.signedUrl ?? null;
          }
          return { ...point, photoUrl };
        })
      );
      return { project: p, points: withPhotos };
    })
  );

  const withOpenItems = sections.filter((s) => s.points.length > 0);

  return (
    <div className="dashboard">
      <div className="header-eyebrow">Overzicht</div>
      <h1 className="page-title">
        Alle openstaande opleverpunten
      </h1>
      {withOpenItems.length === 0 ? (
        <div className="empty-hint">Nergens meer openstaande opleverpunten.</div>
      ) : (
        withOpenItems.map(({ project, points }) => (
          <div key={project.id} className="overview-group">
            <Link href={`/projects/${project.id}/opleverpunten`} className="overview-group-head">
              {project.name} <ArrowRight size={13} />
            </Link>
            <CompletionPointsPanel
              projectId={project.id}
              role={current.profile.role}
              currentTeamMemberId={current.profile.team_member_id}
              isLocked={!!project.delivery_signed_at}
              points={points}
              teamMembers={teamMemberOptions}
              hideAddForm
            />
          </div>
        ))
      )}
    </div>
  );
}
