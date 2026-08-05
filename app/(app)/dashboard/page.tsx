import Link from "next/link";
import { Building2 } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { getProjectsWithProgress } from "@/lib/data";
import { createClient } from "@/lib/supabase/server";
import type { ProjectStatus } from "@/types/database";

const STATUS_LABEL: Record<ProjectStatus, string> = {
  gepland: "Gepland",
  lopend: "Lopend",
  afgerond: "Afgerond",
};

export default async function DashboardPage() {
  const current = await requireUser();
  const projects = await getProjectsWithProgress();
  const supabase = createClient();

  const projectIds = projects.map((p) => p.id);
  let openMeerwerkCount = 0;
  if (projectIds.length) {
    const { count } = await supabase
      .from("extra_work")
      .select("id", { count: "exact", head: true })
      .eq("status", "open")
      .in("project_id", projectIds);
    openMeerwerkCount = count ?? 0;
  }

  const counts = {
    gepland: projects.filter((p) => p.status === "gepland").length,
    lopend: projects.filter((p) => p.status === "lopend").length,
    afgerond: projects.filter((p) => p.status === "afgerond").length,
  };

  return (
    <div className="dashboard">
      <div className="header-eyebrow">Welkom, {current.profile.name}</div>
      <h1 style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: 22, margin: "0 0 4px", textTransform: "uppercase" }}>
        Dashboard
      </h1>

      <div className="dash-cards">
        <div className="dash-card">
          <div className="dash-card-value">{counts.lopend}</div>
          <div className="dash-card-title">Lopende projecten</div>
        </div>
        <div className="dash-card">
          <div className="dash-card-value">{counts.gepland}</div>
          <div className="dash-card-title">Gepland</div>
        </div>
        <div className="dash-card">
          <div className="dash-card-value">{counts.afgerond}</div>
          <div className="dash-card-title">Afgerond</div>
        </div>
        {current.profile.role !== "klant" && (
          <div className="dash-card">
            <div className="dash-card-value">{openMeerwerkCount}</div>
            <div className="dash-card-title">Openstaand meerwerk</div>
          </div>
        )}
      </div>

      <div className="dash-section-title">Projecten</div>
      {projects.length === 0 ? (
        <div className="empty-hint">
          {current.profile.role === "eigenaar" ? (
            <>
              Nog geen projecten. <Link href="/projects/new" className="link-btn">Maak je eerste project aan.</Link>
            </>
          ) : (
            "Nog geen projecten toegewezen."
          )}
        </div>
      ) : (
        <div className="proj-card-grid">
          {projects.map((p) => (
            <Link key={p.id} href={`/projects/${p.id}/planning`} className="proj-card">
              <div className="proj-card-thumb">
                <Building2 size={22} />
              </div>
              <div className="proj-card-body">
                <div className="proj-card-name">{p.name}</div>
                {p.clientName && <div className="proj-card-client">{p.clientName}</div>}
                <div className="proj-card-progress">
                  <div className="proj-card-progress-fill" style={{ width: `${p.progress}%` }} />
                </div>
                <div className="proj-card-foot">
                  <span className={"pill pill-" + p.status}>{STATUS_LABEL[p.status]}</span>
                  <span className="mono">{p.progress}%</span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
