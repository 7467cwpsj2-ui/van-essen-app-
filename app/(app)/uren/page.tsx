import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Clock } from "lucide-react";
import { canSeeHours, requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getProjectsWithProgress } from "@/lib/data";
import { ProjectThumb } from "@/components/ProjectThumb";
import { HoursPanel } from "@/components/HoursPanel";
import type { HourEntry, Project, TeamMember } from "@/types/database";

const STATUS_LABEL: Record<string, string> = {
  gepland: "Gepland",
  lopend: "Lopend",
  afgerond: "Afgerond",
};

export default async function UrenTopLevelPage({ searchParams }: { searchParams: { project?: string } }) {
  const current = await requireUser();
  if (!canSeeHours(current)) notFound();

  const projects = await getProjectsWithProgress();
  // Meestal werkt iemand maar aan één klus tegelijk — dan is kiezen een
  // overbodige extra stap, precies waar de klacht over ging. Sta je op
  // exact één lopend project, dan gaat dat automatisch open.
  const lopend = projects.filter((p) => p.status === "lopend");
  if (!searchParams.project && lopend.length === 1) {
    redirect(`/uren?project=${lopend[0].id}`);
  }

  const selected = searchParams.project ? projects.find((p) => p.id === searchParams.project) : null;

  let panel: React.ReactNode = null;
  if (selected) {
    const supabase = createClient();
    const [{ data: entries }, { data: teamMembers }, { data: project }] = await Promise.all([
      supabase.from("hours").select("*").eq("project_id", selected.id).order("work_date", { ascending: false }),
      supabase.from("team_members").select("*").order("name"),
      supabase.from("projects").select("name,delivery_signed_at").eq("id", selected.id).single(),
    ]);
    panel = (
      <HoursPanel
        projectId={selected.id}
        projectName={(project as Pick<Project, "name" | "delivery_signed_at"> | null)?.name ?? selected.name}
        role={current.profile.role}
        currentTeamMemberId={current.profile.team_member_id}
        isLocked={!!(project as Pick<Project, "delivery_signed_at"> | null)?.delivery_signed_at}
        entries={(entries ?? []) as HourEntry[]}
        teamMembers={((teamMembers ?? []) as TeamMember[]).map((m) => ({ id: m.id, name: m.name }))}
      />
    );
  }

  const ordered = [...lopend, ...projects.filter((p) => p.status !== "lopend")];

  return (
    <div>
      <div className="header-eyebrow">Uren</div>
      <h1 style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: 22, margin: "0 0 12px", textTransform: "uppercase" }}>
        Uren registreren
      </h1>
      {projects.length === 0 ? (
        <div className="empty-hint">Nog geen projecten om uren op te registreren.</div>
      ) : (
        <>
          <div className="dash-panel-list" style={{ marginBottom: 16 }}>
            {ordered.map((p) => (
              <Link
                key={p.id}
                href={`/uren?project=${p.id}`}
                className={"dash-panel-row" + (selected?.id === p.id ? " active" : "")}
              >
                <div className="dash-panel-row-icon">
                  <ProjectThumb id={p.id} name={p.name} coverPhotoUrl={p.coverPhotoUrl} planningColor={p.planning_color} />
                </div>
                <div className="dash-panel-row-body">
                  <div className="dash-panel-row-title">{p.name}</div>
                  <div className="dash-panel-row-sub">
                    {STATUS_LABEL[p.status]}
                    {p.clientName ? ` · ${p.clientName}` : ""}
                  </div>
                </div>
              </Link>
            ))}
          </div>
          {!selected && (
            <div className="empty-hint empty-hint-row">
              <span className="empty-hint-icon-chip">
                <Clock size={13} />
              </span>
              Kies hierboven eerst een project.
            </div>
          )}
          {panel}
        </>
      )}
    </div>
  );
}
