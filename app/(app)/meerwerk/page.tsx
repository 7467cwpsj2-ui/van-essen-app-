import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { canSeeModule, requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { ExtraWorkPanel, type ExtraWorkWithSignature } from "@/components/ExtraWorkPanel";
import type { ExtraWork, SchedulePhase } from "@/types/database";

export default async function AlleMeerwerkPage() {
  const current = await requireUser();
  if (!canSeeModule(current, "meerwerk")) {
    return <div className="empty-hint">Je hebt geen toegang tot deze module.</div>;
  }

  const supabase = createClient();
  const { data: projects } = await supabase.from("projects").select("id,name").order("name");
  const projectIds = (projects ?? []).map((p) => p.id);

  const [{ data: allItems }, { data: allPhases }] =
    projectIds.length > 0
      ? await Promise.all([
          supabase.from("extra_work").select("*").in("project_id", projectIds).eq("status", "open").order("created_at", { ascending: false }),
          supabase.from("schedule_phases").select("*").in("project_id", projectIds).order("start_date"),
        ])
      : [{ data: [] as ExtraWork[] }, { data: [] as SchedulePhase[] }];

  const itemsByProject = new Map<string, ExtraWork[]>();
  for (const w of (allItems ?? []) as ExtraWork[]) {
    const list = itemsByProject.get(w.project_id) ?? [];
    list.push(w);
    itemsByProject.set(w.project_id, list);
  }
  const phasesByProject = new Map<string, SchedulePhase[]>();
  for (const ph of (allPhases ?? []) as SchedulePhase[]) {
    const list = phasesByProject.get(ph.project_id) ?? [];
    list.push(ph);
    phasesByProject.set(ph.project_id, list);
  }

  const sections = (projects ?? []).map((p) => {
    const withSignatures: ExtraWorkWithSignature[] = (itemsByProject.get(p.id) ?? []).map((w) => ({
      ...w,
      signatureUrl: null,
      attachmentUrl: null,
    }));
    return { project: p, items: withSignatures, phases: phasesByProject.get(p.id) ?? [] };
  });

  const withOpenItems = sections.filter((s) => s.items.length > 0);

  return (
    <div className="dashboard">
      <div className="header-eyebrow">Overzicht</div>
      <h1 className="page-title">
        Alle openstaand meer-/minderwerk
      </h1>
      {withOpenItems.length === 0 ? (
        <div className="empty-hint">Nergens meer openstaand meer- of minderwerk.</div>
      ) : (
        withOpenItems.map(({ project, items, phases }) => (
          <div key={project.id} className="overview-group">
            <Link href={`/projects/${project.id}/meerwerk`} className="overview-group-head">
              {project.name} <ArrowRight size={13} />
            </Link>
            <ExtraWorkPanel projectId={project.id} role={current.profile.role} phases={phases} items={items} hideAddForm />
          </div>
        ))
      )}
    </div>
  );
}
