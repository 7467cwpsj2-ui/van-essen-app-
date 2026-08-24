import { notFound, redirect } from "next/navigation";
import { Clock } from "lucide-react";
import { canSeeHours, requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getProjectsWithProgress } from "@/lib/data";
import { HoursPanel } from "@/components/HoursPanel";
import { UrenPicker } from "@/components/UrenPicker";
import type { HourEntry, Project, QuickJob, TeamMember } from "@/types/database";

export default async function UrenTopLevelPage({
  searchParams,
}: {
  searchParams: { project?: string; job?: string; open?: string };
}) {
  const current = await requireUser();
  if (!canSeeHours(current)) notFound();
  // Voor team-rollen is dit het eigen profiel; een eigenaar die zichzelf
  // als eigen personeel heeft toegevoegd (migratie 0061) gebruikt hier
  // diezelfde staff-koppeling, zodat hij ook zelf snel uren kan loggen.
  const myStaffId = current.profile.role === "team" ? current.profile.team_member_id : current.ownStaffMember?.id ?? null;

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
  const openJobs = quickJobs.filter((j) => !j.done);
  if (!searchParams.project && !searchParams.job && lopend.length === 1 && openJobs.length === 0) {
    redirect(`/uren?project=${lopend[0].id}`);
  }
  if (!searchParams.project && !searchParams.job && lopend.length === 0 && openJobs.length === 1) {
    redirect(`/uren?job=${openJobs[0].id}`);
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
        key={selectedProject.id}
        target={{ projectId: selectedProject.id }}
        targetName={(project as Pick<Project, "name" | "delivery_signed_at"> | null)?.name ?? selectedProject.name}
        role={current.profile.role}
        currentTeamMemberId={myStaffId}
        isLocked={!!(project as Pick<Project, "delivery_signed_at"> | null)?.delivery_signed_at}
        entries={(entries ?? []) as HourEntry[]}
        teamMembers={((teamMembers ?? []) as TeamMember[]).map((m) => ({ id: m.id, name: m.name }))}
        autoOpenDetail={searchParams.open === "1"}
      />
    );
  } else if (selectedJob) {
    const [{ data: entries }, { data: teamMembers }] = await Promise.all([
      supabase.from("hours").select("*").eq("quick_job_id", selectedJob.id).order("work_date", { ascending: false }),
      supabase.from("team_members").select("*").order("name"),
    ]);
    panel = (
      <HoursPanel
        key={selectedJob.id}
        target={{ quickJobId: selectedJob.id }}
        targetName={selectedJob.title}
        role={current.profile.role}
        currentTeamMemberId={myStaffId}
        isLocked={false}
        entries={(entries ?? []) as HourEntry[]}
        teamMembers={((teamMembers ?? []) as TeamMember[]).map((m) => ({ id: m.id, name: m.name }))}
        autoOpenDetail={searchParams.open === "1"}
      />
    );
  }

  const nothingToPick = projects.length === 0 && quickJobs.length === 0;

  return (
    <div>
      <div className="header-eyebrow">Uren</div>
      <h1 className="page-title">
        Uren registreren
      </h1>
      {nothingToPick ? (
        <div className="empty-hint">Nog geen projecten of klussen om uren op te registreren.</div>
      ) : (
        <>
          <UrenPicker
            projects={projects.map((p) => ({
              id: p.id,
              name: p.name,
              status: p.status,
              clientName: p.clientName,
              coverPhotoUrl: p.coverPhotoUrl,
              planningColor: p.planning_color,
            }))}
            quickJobs={quickJobs.map((j) => ({ id: j.id, title: j.title, start_date: j.start_date, end_date: j.end_date, done: j.done }))}
            selectedProjectId={selectedProject?.id ?? null}
            selectedJobId={selectedJob?.id ?? null}
            canQuickAdd={!!myStaffId}
            currentTeamMemberId={myStaffId}
            todayIso={new Date().toISOString().slice(0, 10)}
          />
          {!selectedProject && !selectedJob && (
            <div className="empty-hint empty-hint-row" style={{ marginTop: 12 }}>
              <span className="empty-hint-icon-chip">
                <Clock size={13} />
              </span>
              Kies hierboven eerst een project of klus, of registreer direct uren voor vandaag.
            </div>
          )}
          {panel}
        </>
      )}
    </div>
  );
}
