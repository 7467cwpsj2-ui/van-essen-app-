import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Clock, Hammer } from "lucide-react";
import { canSeeHours, requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getProjectsWithProgress } from "@/lib/data";
import { ProjectThumb } from "@/components/ProjectThumb";
import { HoursPanel } from "@/components/HoursPanel";
import type { HourEntry, Project, QuickJob, TeamMember } from "@/types/database";

const STATUS_LABEL: Record<string, string> = {
  gepland: "Gepland",
  lopend: "Lopend",
  afgerond: "Afgerond",
};

export default async function UrenTopLevelPage({ searchParams }: { searchParams: { project?: string; job?: string } }) {
  const current = await requireUser();
  if (!canSeeHours(current)) notFound();

  const supabase = createClient();
  const [projects, { data: quickJobsData }] = await Promise.all([
    getProjectsWithProgress(),
    supabase.from("quick_jobs").select("*").order("start_date", { ascending: false }),
  ]);
  const quickJobs = (quickJobsData ?? []) as QuickJob[];

  // Meestal werkt iemand maar aan één klus tegelijk — dan is kiezen een
  // overbodige extra stap, precies waar de klacht over ging. Sta je op
  // exact één lopend project en zijn er geen losse klussen om uit te
  // kiezen, dan gaat dat ene project automatisch open.
  const lopend = projects.filter((p) => p.status === "lopend");
  if (!searchParams.project && !searchParams.job && lopend.length === 1 && quickJobs.length === 0) {
    redirect(`/uren?project=${lopend[0].id}`);
  }

  const selectedProject = searchParams.project ? projects.find((p) => p.id === searchParams.project) : null;
  const selectedJob = searchParams.job ? quickJobs.find((j) => j.id === searchParams.job) : null;

  let panel: React.ReactNode = null;
  if (selectedProject) {
    const [{ data: entries }, { data: teamMembers }, { data: project }] = await Promise.all([
      supabase.from("hours").select("*").eq("project_id", selectedProject.id).order("work_date", { ascending: false }),
      supabase.from("team_members").select("*").order("name"),
      supabase.from("projects").select("name,delivery_signed_at").eq("id", selectedProject.id).single(),
    ]);
    panel = (
      <HoursPanel
        target={{ projectId: selectedProject.id }}
        targetName={(project as Pick<Project, "name" | "delivery_signed_at"> | null)?.name ?? selectedProject.name}
        role={current.profile.role}
        currentTeamMemberId={current.profile.team_member_id}
        isLocked={!!(project as Pick<Project, "delivery_signed_at"> | null)?.delivery_signed_at}
        entries={(entries ?? []) as HourEntry[]}
        teamMembers={((teamMembers ?? []) as TeamMember[]).map((m) => ({ id: m.id, name: m.name }))}
      />
    );
  } else if (selectedJob) {
    const [{ data: entries }, { data: teamMembers }] = await Promise.all([
      supabase.from("hours").select("*").eq("quick_job_id", selectedJob.id).order("work_date", { ascending: false }),
      supabase.from("team_members").select("*").order("name"),
    ]);
    panel = (
      <HoursPanel
        target={{ quickJobId: selectedJob.id }}
        targetName={selectedJob.title}
        role={current.profile.role}
        currentTeamMemberId={current.profile.team_member_id}
        isLocked={false}
        entries={(entries ?? []) as HourEntry[]}
        teamMembers={((teamMembers ?? []) as TeamMember[]).map((m) => ({ id: m.id, name: m.name }))}
      />
    );
  }

  const orderedProjects = [...lopend, ...projects.filter((p) => p.status !== "lopend")];
  const nothingToPick = orderedProjects.length === 0 && quickJobs.length === 0;

  return (
    <div>
      <div className="header-eyebrow">Uren</div>
      <h1 style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: 22, margin: "0 0 12px", textTransform: "uppercase" }}>
        Uren registreren
      </h1>
      {nothingToPick ? (
        <div className="empty-hint">Nog geen projecten of klussen om uren op te registreren.</div>
      ) : (
        <>
          <div className="dash-panel-list" style={{ marginBottom: 16 }}>
            {orderedProjects.map((p) => (
              <Link
                key={p.id}
                href={`/uren?project=${p.id}`}
                className={"dash-panel-row" + (selectedProject?.id === p.id ? " active" : "")}
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
            {quickJobs.map((j) => (
              <Link key={j.id} href={`/uren?job=${j.id}`} className={"dash-panel-row" + (selectedJob?.id === j.id ? " active" : "")}>
                <div className="dash-panel-row-icon">
                  <Hammer size={14} />
                </div>
                <div className="dash-panel-row-body">
                  <div className="dash-panel-row-title">{j.title}</div>
                  <div className="dash-panel-row-sub">
                    Losse klus · {j.start_date === j.end_date ? j.start_date : `${j.start_date} – ${j.end_date}`}
                  </div>
                </div>
              </Link>
            ))}
          </div>
          {!selectedProject && !selectedJob && (
            <div className="empty-hint empty-hint-row">
              <span className="empty-hint-icon-chip">
                <Clock size={13} />
              </span>
              Kies hierboven eerst een project of klus.
            </div>
          )}
          {panel}
        </>
      )}
    </div>
  );
}
