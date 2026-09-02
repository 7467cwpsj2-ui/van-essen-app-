import Link from "next/link";
import { isoWeekNumber } from "@/lib/workingDays";
import { colorForProject } from "@/lib/projectColor";
import type { DayPart } from "@/types/database";

export interface MyPlanEntry {
  id: string;
  title: string;
  subtitle: string | null;
  projectId: string | null;
  quickJobId: string | null;
  kind: "klus" | "kantoor" | "verlof";
  color: string | null;
  start_date: string;
  end_date: string;
  daypart: DayPart;
  done: boolean;
  fixedDate: boolean;
}

const OFFICE_COLOR = "#64748b";
const VACATION_COLOR = "#f59e0b";

function fmtShort(iso: string) {
  return new Intl.DateTimeFormat("nl-NL", { day: "numeric", month: "short" }).format(new Date(iso + "T00:00:00Z"));
}

function colorFor(e: MyPlanEntry) {
  if (e.kind === "kantoor") return OFFICE_COLOR;
  if (e.kind === "verlof") return VACATION_COLOR;
  return e.color || colorForProject(e.projectId ?? e.id);
}

function href(e: MyPlanEntry) {
  if (e.projectId) return `/projects/${e.projectId}/bouwplanning`;
  if (e.quickJobId) return `/klussen/${e.quickJobId}`;
  return null;
}

export function MyPlanningPanel({ weeks }: { weeks: [string, MyPlanEntry[]][] }) {
  const todayIso = new Date().toISOString().slice(0, 10);

  return (
    <div className="panel">
      <div className="header-eyebrow">Overzicht</div>
      <h1 className="page-title">Mijn planning</h1>
      <div className="hint-bar">Waar je de komende tijd ingepland staat — projecten, losse klussen, kantoor en vakantie samen.</div>

      {weeks.length === 0 ? (
        <div className="empty-hint">Je staat momenteel nergens ingepland.</div>
      ) : (
        weeks.map(([monday, entries]) => {
          const weekNum = isoWeekNumber(new Date(monday + "T00:00:00Z"));
          const isCurrentWeek = entries.some((e) => e.start_date <= todayIso && todayIso <= e.end_date) || monday <= todayIso;
          return (
            <div key={monday}>
              <div className="add-form-title" style={{ marginTop: 4 }}>
                Week {weekNum}
                {isCurrentWeek && (
                  <span className="stamp stamp-open" style={{ marginLeft: 8 }}>
                    Nu
                  </span>
                )}
              </div>
              <div className="task-list">
                {entries.map((e) => {
                  const link = href(e);
                  const body = (
                    <>
                      <span
                        className="planning-legend-swatch planning-legend-swatch-static"
                        style={{ background: colorFor(e), flexShrink: 0 }}
                      />
                      <div className="task-body">
                        <div className="task-title">
                          {e.kind === "kantoor" ? "🏢 " : e.kind === "verlof" ? "🏖️ " : ""}
                          {e.title}
                        </div>
                        <div className="task-meta">
                          {e.subtitle && <span>{e.subtitle}</span>}
                          <span className="mono">
                            {fmtShort(e.start_date)}
                            {e.start_date !== e.end_date ? ` – ${fmtShort(e.end_date)}` : ""}
                          </span>
                          {e.daypart !== "dag" && (
                            <span className="stamp stamp-open">{e.daypart === "ochtend" ? "Ochtend" : "Middag"}</span>
                          )}
                          {e.fixedDate && <span>vaste datum</span>}
                        </div>
                      </div>
                    </>
                  );
                  return link ? (
                    <Link key={e.id} href={link} className="task-row">
                      {body}
                    </Link>
                  ) : (
                    <div key={e.id} className="task-row">
                      {body}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}
