import Link from "next/link";
import { Building2, Camera, CheckCircle2, Clock, Euro, TrendingDown, TrendingUp } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { getDashboardExtras, getProjectsWithProgress, type ActivityItem } from "@/lib/data";
import { timeAgo } from "@/lib/timeAgo";
import { TASK_ASSIGNEE_LABEL, type ProjectStatus } from "@/types/database";

const STATUS_LABEL: Record<ProjectStatus, string> = {
  gepland: "Gepland",
  lopend: "Lopend",
  afgerond: "Afgerond",
};

const fmtEuro = (n: number) => new Intl.NumberFormat("nl-NL", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(n);

const ACTIVITY_ICON: Record<ActivityItem["kind"], React.ReactNode> = {
  meerwerk: <TrendingUp size={14} />,
  minderwerk: <TrendingDown size={14} />,
  foto: <Camera size={14} />,
};

export default async function DashboardPage() {
  const current = await requireUser();
  const projects = await getProjectsWithProgress();
  const extras = await getDashboardExtras(projects, current.profile.role);

  const counts = {
    gepland: projects.filter((p) => p.status === "gepland").length,
    lopend: projects.filter((p) => p.status === "lopend").length,
    afgerond: projects.filter((p) => p.status === "afgerond").length,
  };

  const topProjects = [...projects]
    .sort((a, b) => (a.status === "lopend" ? -1 : 1) - (b.status === "lopend" ? -1 : 1))
    .slice(0, 5);

  const revenueDelta =
    extras.revenueThisMonth && extras.revenueThisMonth.previousAmount > 0
      ? Math.round(((extras.revenueThisMonth.amount - extras.revenueThisMonth.previousAmount) / extras.revenueThisMonth.previousAmount) * 100)
      : null;

  return (
    <div className="dashboard">
      <div className="header-eyebrow">Welkom, {current.profile.name}</div>
      <h1 style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: 22, margin: "0 0 4px", textTransform: "uppercase" }}>
        Dashboard
      </h1>

      <div className="dash-cards">
        <a href="#alle-projecten" className="dash-card">
          <div className="dash-card-icon">
            <Building2 size={16} />
          </div>
          <div className="dash-card-value">{counts.lopend}</div>
          <div className="dash-card-title">Lopende projecten</div>
        </a>
        <Link href="/te-doen" className="dash-card">
          <div className="dash-card-icon">
            <Clock size={16} />
          </div>
          <div className="dash-card-value">{extras.todayTasks.length}</div>
          <div className="dash-card-title">Te doen vandaag</div>
        </Link>
        {current.profile.role !== "klant" && (
          <Link href="/meerwerk" className="dash-card">
            <div className="dash-card-icon">
              <TrendingUp size={16} />
            </div>
            <div className="dash-card-value">{extras.openMeerwerk.count}</div>
            <div className="dash-card-title">
              Meerwerk openstaand{extras.openMeerwerk.amount > 0 ? ` · ${fmtEuro(extras.openMeerwerk.amount)}` : ""}
            </div>
          </Link>
        )}
        <Link href="/opleverpunten" className="dash-card">
          <div className="dash-card-icon">
            <CheckCircle2 size={16} />
          </div>
          <div className="dash-card-value">{extras.openCompletionPoints}</div>
          <div className="dash-card-title">Opleverpunten open</div>
        </Link>
        {extras.revenueThisMonth && (
          <div className="dash-card">
            <div className="dash-card-icon">
              <Euro size={16} />
            </div>
            <div className="dash-card-value">{fmtEuro(extras.revenueThisMonth.amount)}</div>
            <div className="dash-card-title">
              Omzet deze maand
              {revenueDelta !== null && (
                <span className={"dash-card-delta " + (revenueDelta >= 0 ? "up" : "down")}>
                  {" "}
                  {revenueDelta >= 0 ? "+" : ""}
                  {revenueDelta}% t.o.v. vorige maand
                </span>
              )}
            </div>
          </div>
        )}
      </div>

      <div className="dash-panels">
        <div className="dash-panel">
          <div className="dash-panel-head">
            <span>Projecten overzicht</span>
            {projects.length > 5 && (
              <a href="#alle-projecten" className="link-btn">
                Bekijk alle
              </a>
            )}
          </div>
          {topProjects.length === 0 ? (
            <div className="empty-hint small">Nog geen projecten.</div>
          ) : (
            <div className="dash-panel-list">
              {topProjects.map((p) => (
                <Link key={p.id} href={`/projects/${p.id}/planning`} className="dash-panel-row">
                  <div className="dash-panel-row-icon">
                    <Building2 size={14} />
                  </div>
                  <div className="dash-panel-row-body">
                    <div className="dash-panel-row-title">{p.name}</div>
                    {p.clientName && <div className="dash-panel-row-sub">{p.clientName}</div>}
                    <div className="proj-card-progress">
                      <div className="proj-card-progress-fill" style={{ width: `${p.progress}%` }} />
                    </div>
                  </div>
                  <span className="mono dash-panel-row-pct">{p.progress}%</span>
                </Link>
              ))}
            </div>
          )}
        </div>

        <div className="dash-panel">
          <div className="dash-panel-head">
            <span>Te doen vandaag</span>
            <Link href="/te-doen" className="link-btn">
              Bekijk alle
            </Link>
          </div>
          {extras.todayTasks.length === 0 ? (
            <div className="empty-hint small">Niets te doen gepland voor vandaag.</div>
          ) : (
            <div className="dash-panel-list">
              {extras.todayTasks.map((t) => (
                <Link key={t.id} href={`/projects/${t.projectId}/planning`} className="dash-panel-row">
                  <div className="dash-panel-row-icon">
                    <Clock size={14} />
                  </div>
                  <div className="dash-panel-row-body">
                    <div className="dash-panel-row-title">{t.title}</div>
                    <div className="dash-panel-row-sub">
                      {t.projectName} · {TASK_ASSIGNEE_LABEL[t.assigneeType]}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        <div className="dash-panel">
          <div className="dash-panel-head">
            <span>Laatste meldingen</span>
          </div>
          {extras.activity.length === 0 ? (
            <div className="empty-hint small">Nog geen activiteit.</div>
          ) : (
            <div className="dash-panel-list">
              {extras.activity.map((a) => (
                <div key={a.id} className="dash-panel-row static">
                  <div className={"dash-panel-row-icon activity-" + a.kind}>{ACTIVITY_ICON[a.kind]}</div>
                  <div className="dash-panel-row-body">
                    <div className="dash-panel-row-title">{a.text}</div>
                    <div className="dash-panel-row-sub">
                      {a.projectName} · {timeAgo(a.createdAt)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div id="alle-projecten" className="dash-section-title">
        Alle projecten
      </div>
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
