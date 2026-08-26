import Link from "next/link";
import { Building2, Camera, CheckCircle2, ClipboardList, Clock, MapPin, Sparkles, TrendingDown, TrendingUp } from "lucide-react";
import { canSeeModule, requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { siteUrl } from "@/lib/siteUrl";
import { CalendarFeedCard } from "@/components/CalendarFeedCard";
import { ProjectThumb } from "@/components/ProjectThumb";
import {
  getDashboardExtras,
  getLeadsSummary,
  getMyHoursToday,
  getMySchedule,
  getProjectsWithProgress,
  getTodayStaffSchedule,
  type ActivityItem,
} from "@/lib/data";
import { timeAgo } from "@/lib/timeAgo";
import { timeAwareGreeting } from "@/lib/greeting";
import { TASK_ASSIGNEE_LABEL, type ProjectStatus } from "@/types/database";

const STATUS_LABEL: Record<ProjectStatus, string> = {
  gepland: "Gepland",
  lopend: "Lopend",
  afgerond: "Afgerond",
};

const fmtEuro = (n: number) => new Intl.NumberFormat("nl-NL", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(n);
const fmtShort = (iso: string) => new Intl.DateTimeFormat("nl-NL", { day: "numeric", month: "short" }).format(new Date(iso + "T00:00:00Z"));

const ACTIVITY_ICON: Record<ActivityItem["kind"], React.ReactNode> = {
  meerwerk: <TrendingUp size={14} />,
  minderwerk: <TrendingDown size={14} />,
  foto: <Camera size={14} />,
};

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: { status?: string };
}) {
  const current = await requireUser();
  const projects = await getProjectsWithProgress();
  const extras = await getDashboardExtras(projects);
  // Voor team-rollen loopt dit via het gewone profiel; een eigenaar die
  // zichzelf als eigen personeel heeft toegevoegd (zie migratie 0061)
  // krijgt hier hetzelfde via ownStaffMember, zonder dat dit iets aan
  // zijn rechten als eigenaar verandert.
  const myStaffId = current.profile.role === "team" ? current.profile.team_member_id : current.ownStaffMember?.id ?? null;
  const mySchedule = myStaffId ? await getMySchedule(myStaffId) : [];
  const staffToday = current.profile.role === "eigenaar" ? await getTodayStaffSchedule() : [];
  const leadsSummary = current.profile.role === "eigenaar" ? await getLeadsSummary() : { openCount: 0, overdueCount: 0 };
  const myHoursToday = myStaffId ? await getMyHoursToday(myStaffId) : null;
  let calendarFeedUrl: string | null = null;
  if (myStaffId) {
    const supabase = createClient();
    const { data: staffRow } = await supabase.from("team_members").select("calendar_token").eq("id", myStaffId).maybeSingle();
    if (staffRow?.calendar_token) {
      calendarFeedUrl = `${siteUrl()}/api/agenda/${staffRow.calendar_token}`;
    }
  }

  const hasOverdueTasks = extras.todayTasks.some((t) => t.overdue);

  const counts = {
    gepland: projects.filter((p) => p.status === "gepland").length,
    lopend: projects.filter((p) => p.status === "lopend").length,
    afgerond: projects.filter((p) => p.status === "afgerond").length,
  };

  const topProjects = [...projects]
    .sort((a, b) => (a.status === "lopend" ? -1 : 1) - (b.status === "lopend" ? -1 : 1))
    .slice(0, 5);

  const statusFilter = searchParams.status === "gepland" || searchParams.status === "lopend" || searchParams.status === "afgerond" ? searchParams.status : null;
  const visibleProjects = statusFilter ? projects.filter((p) => p.status === statusFilter) : projects;
  const firstName = current.profile.name.split(" ")[0];
  const todayLong = new Intl.DateTimeFormat("nl-NL", {
    timeZone: "Europe/Amsterdam",
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(new Date());

  return (
    <div className="dashboard">
      <div className="header-eyebrow">Dashboard</div>
      <h1 className="dash-greeting">
        {timeAwareGreeting()}, {firstName}
      </h1>
      <div className="dash-greeting-date">{todayLong}</div>

      <div className="dash-cards">
        <a href="/dashboard?status=lopend#alle-projecten" className="dash-card">
          <div className="dash-card-icon">
            <Building2 size={16} />
          </div>
          <div className="dash-card-value">{counts.lopend}</div>
          <div className="dash-card-title">Lopende projecten</div>
        </a>
        <Link href="/te-doen" className={"dash-card" + (hasOverdueTasks ? " accent" : "")}>
          <div className={"dash-card-icon" + (hasOverdueTasks ? " warning" : "")}>
            <Clock size={16} />
          </div>
          <div className="dash-card-value">{extras.todayTasks.length}</div>
          <div className="dash-card-title">Te doen{hasOverdueTasks ? " — ook achterstallig" : " vandaag"}</div>
        </Link>
        {myHoursToday !== null && (
          <Link href="/uren" className={"dash-card" + (myHoursToday === 0 ? " accent" : "")}>
            <div className={"dash-card-icon" + (myHoursToday === 0 ? " warning" : "")}>
              <Clock size={16} />
            </div>
            <div className="dash-card-value">{myHoursToday}</div>
            <div className="dash-card-title">Mijn uren vandaag{myHoursToday === 0 ? " — nog invullen" : ""}</div>
          </Link>
        )}
        {current.profile.role === "eigenaar" && (
          <Link href="/offertes" className={"dash-card" + (leadsSummary.overdueCount > 0 ? " accent" : "")}>
            <div className={"dash-card-icon" + (leadsSummary.overdueCount > 0 ? " warning" : "")}>
              <ClipboardList size={16} />
            </div>
            <div className="dash-card-value">{leadsSummary.overdueCount}</div>
            <div className="dash-card-title">
              Offertes te laat{leadsSummary.openCount > leadsSummary.overdueCount ? ` · ${leadsSummary.openCount} open` : ""}
            </div>
          </Link>
        )}
        {current.profile.role !== "klant" && canSeeModule(current, "meerwerk") && (
          <Link href="/meerwerk" className={"dash-card" + (extras.openMeerwerk.count > 0 ? " accent" : "")}>
            <div className={"dash-card-icon" + (extras.openMeerwerk.count > 0 ? " warning" : "")}>
              <TrendingUp size={16} />
            </div>
            <div className="dash-card-value">{extras.openMeerwerk.count}</div>
            <div className="dash-card-title">
              Meerwerk openstaand{extras.openMeerwerk.amount > 0 ? ` · ${fmtEuro(extras.openMeerwerk.amount)}` : ""}
            </div>
          </Link>
        )}
        {canSeeModule(current, "opleverpunten") && (
          <Link href="/opleverpunten" className="dash-card">
            <div className="dash-card-icon">
              <CheckCircle2 size={16} />
            </div>
            <div className="dash-card-value">{extras.openCompletionPoints}</div>
            <div className="dash-card-title">Opleverpunten open</div>
          </Link>
        )}
      </div>

      <div className="dash-panels">
        {current.profile.role === "eigenaar" && (
          <div className="dash-panel">
            <div className="dash-panel-head">
              <span>Personeel vandaag</span>
              <Link href="/planning-overzicht" className="link-btn">
                Bekijk alle
              </Link>
            </div>
            {staffToday.length === 0 ? (
              <div className="empty-hint small empty-hint-row">
                <span className="empty-hint-icon-chip">
                  <MapPin size={13} />
                </span>
                Niemand van je eigen personeel staat vandaag ingepland.
              </div>
            ) : (
              <div className="dash-panel-list">
                {staffToday.map((s, idx) => {
                  const row = (
                    <>
                      <div className="dash-panel-row-icon">
                        <MapPin size={14} />
                      </div>
                      <div className="dash-panel-row-body">
                        <div className="dash-panel-row-title">{s.teamMemberName}</div>
                        <div className="dash-panel-row-sub">
                          {s.projectName} — {s.title}
                        </div>
                      </div>
                    </>
                  );
                  return s.projectId ? (
                    <Link key={`${s.teamMemberId}-${idx}`} href={`/projects/${s.projectId}/bouwplanning`} className="dash-panel-row">
                      {row}
                    </Link>
                  ) : s.quickJobId ? (
                    <Link key={`${s.teamMemberId}-${idx}`} href={`/klussen/${s.quickJobId}`} className="dash-panel-row">
                      {row}
                    </Link>
                  ) : (
                    <Link key={`${s.teamMemberId}-${idx}`} href="/planning-overzicht" className="dash-panel-row">
                      {row}
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {myStaffId && (
          <div className="dash-panel">
            <div className="dash-panel-head">
              <span>Mijn planning</span>
            </div>
            {mySchedule.length === 0 ? (
              <div className="empty-hint small empty-hint-row">
                <span className="empty-hint-icon-chip">
                  <Clock size={13} />
                </span>
                Je staat momenteel nergens ingepland.
              </div>
            ) : (
              <div className="dash-panel-list">
                {mySchedule.map((s) => {
                  const row = (
                    <>
                      <div className="dash-panel-row-icon">
                        <Clock size={14} />
                      </div>
                      <div className="dash-panel-row-body">
                        <div className="dash-panel-row-title">{s.title}</div>
                        <div className="dash-panel-row-sub">
                          {s.projectName} · {fmtShort(s.start_date)} – {fmtShort(s.end_date)}
                        </div>
                      </div>
                    </>
                  );
                  return s.projectId ? (
                    <Link key={s.id} href={`/projects/${s.projectId}/bouwplanning`} className="dash-panel-row">
                      {row}
                    </Link>
                  ) : s.quickJobId ? (
                    <Link key={s.id} href={`/klussen/${s.quickJobId}`} className="dash-panel-row">
                      {row}
                    </Link>
                  ) : (
                    <div key={s.id} className="dash-panel-row static">
                      {row}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {myStaffId && <CalendarFeedCard initialUrl={calendarFeedUrl} />}

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
                    <ProjectThumb id={p.id} name={p.name} coverPhotoUrl={p.coverPhotoUrl} planningColor={p.planning_color} />
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
            <span>Te doen</span>
            <Link href="/te-doen" className="link-btn">
              Bekijk alle
            </Link>
          </div>
          {extras.todayTasks.length === 0 ? (
            <div className="empty-hint small empty-hint-row">
              <span className="empty-hint-icon-chip">
                <Clock size={13} />
              </span>
              Niets te doen gepland voor vandaag.
            </div>
          ) : (
            <div className="dash-panel-list">
              {extras.todayTasks.map((t) => (
                <Link
                  key={t.id}
                  href={`/projects/${t.projectId}/planning`}
                  className={"dash-panel-row" + (t.overdue ? " overdue" : "")}
                >
                  <div className="dash-panel-row-icon">
                    <Clock size={14} />
                  </div>
                  <div className="dash-panel-row-body">
                    <div className="dash-panel-row-title">{t.title}</div>
                    <div className="dash-panel-row-sub">
                      {t.projectName} · {TASK_ASSIGNEE_LABEL[t.assigneeType]}
                      {t.overdue && <span className="task-overdue"> · achterstallig sinds {fmtShort(t.dueDate)}</span>}
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
            <div className="empty-hint small empty-hint-row">
              <span className="empty-hint-icon-chip">
                <Sparkles size={13} />
              </span>
              Nog geen activiteit.
            </div>
          ) : (
            <div className="dash-panel-list">
              {extras.activity.map((a) => (
                <Link
                  key={a.id}
                  href={`/projects/${a.projectId}/${a.kind === "foto" ? "fotos" : "meerwerk"}`}
                  className="dash-panel-row"
                >
                  <div className={"dash-panel-row-icon activity-" + a.kind}>{ACTIVITY_ICON[a.kind]}</div>
                  <div className="dash-panel-row-body">
                    <div className="dash-panel-row-title">{a.text}</div>
                    <div className="dash-panel-row-sub">
                      {a.projectName} · {timeAgo(a.createdAt)}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>

      <div id="alle-projecten" className="dash-section-title" style={{ display: "flex", alignItems: "center", gap: 10 }}>
        {statusFilter ? STATUS_LABEL[statusFilter] + " projecten" : "Alle projecten"}
        {statusFilter && (
          <Link href="/dashboard#alle-projecten" className="link-btn" style={{ fontSize: 12, fontWeight: 500 }}>
            Alles tonen
          </Link>
        )}
      </div>
      {visibleProjects.length === 0 ? (
        <div className="empty-hint">
          {statusFilter
            ? `Geen ${STATUS_LABEL[statusFilter].toLowerCase()} projecten.`
            : current.profile.role === "eigenaar"
            ? (
              <>
                Nog geen projecten. <Link href="/projects/new" className="link-btn">Maak je eerste project aan.</Link>
              </>
            )
            : "Nog geen projecten toegewezen."}
        </div>
      ) : (
        <div className="proj-card-grid">
          {visibleProjects.map((p) => (
            <Link
              key={p.id}
              href={`/projects/${p.id}/planning`}
              className={"proj-card" + (p.status === "afgerond" ? " is-done" : "")}
            >
              <div className="proj-card-thumb">
                <ProjectThumb id={p.id} name={p.name} coverPhotoUrl={p.coverPhotoUrl} planningColor={p.planning_color} />
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
