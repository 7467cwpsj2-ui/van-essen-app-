import Link from "next/link";
import { AlertTriangle, Users } from "lucide-react";

export interface PlanningRow {
  id: string;
  title: string;
  projectId: string;
  projectName: string;
  assignee: string | null;
  start_date: string;
  end_date: string;
}

function overlaps(aStart: string, aEnd: string, bStart: string, bEnd: string) {
  return aStart <= bEnd && bStart <= aEnd;
}

function fmtRange(startIso: string, endIso: string) {
  const start = new Date(startIso + "T00:00:00Z");
  const end = new Date(endIso + "T00:00:00Z");
  const dayOnly = new Intl.DateTimeFormat("nl-NL", { day: "numeric" });
  const dayMonth = new Intl.DateTimeFormat("nl-NL", { day: "numeric", month: "short" });
  if (startIso === endIso) return dayMonth.format(start);
  if (start.getUTCMonth() === end.getUTCMonth() && start.getUTCFullYear() === end.getUTCFullYear()) {
    return `${dayOnly.format(start)} – ${dayMonth.format(end)}`;
  }
  return `${dayMonth.format(start)} – ${dayMonth.format(end)}`;
}

export function TeamPlanningPanel({ rows }: { rows: PlanningRow[] }) {
  const todayIso = new Date().toISOString().slice(0, 10);

  const conflictIds = new Set<string>();
  for (const a of rows) {
    if (!a.assignee) continue;
    for (const b of rows) {
      if (
        a.id !== b.id &&
        b.assignee &&
        a.assignee.toLowerCase() === b.assignee.toLowerCase() &&
        overlaps(a.start_date, a.end_date, b.start_date, b.end_date)
      ) {
        conflictIds.add(a.id);
      }
    }
  }

  const active = rows
    .filter((r) => r.start_date <= todayIso && todayIso <= r.end_date)
    .sort((a, b) => (a.assignee ?? "").localeCompare(b.assignee ?? "", "nl"));

  const upcoming = rows.filter((r) => r.end_date >= todayIso);
  const groups = new Map<string, PlanningRow[]>();
  for (const r of upcoming) {
    const key = r.assignee ?? "Nog niet toegewezen";
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(r);
  }
  const groupEntries = Array.from(groups.entries()).sort(([a], [b]) => {
    if (a === "Nog niet toegewezen") return 1;
    if (b === "Nog niet toegewezen") return -1;
    return a.localeCompare(b, "nl");
  });

  return (
    <div className="panel">
      <div className="hint-bar">
        Wie loopt waar en wanneer, over al je projecten heen. Eerst wie er vandaag bezig is, daaronder de planning per persoon.
      </div>

      <div className="overview-group">
        <div className="overview-group-head">
          <Users size={15} /> Vandaag bezig
        </div>
        {active.length === 0 ? (
          <div className="empty-hint small">Niemand staat vandaag ingepland.</div>
        ) : (
          <div className="task-list">
            {active.map((r) => (
              <div key={r.id} className="task-row">
                <div className="task-body">
                  <div className="task-title">
                    {r.assignee ?? "Nog niet toegewezen"}
                    {conflictIds.has(r.id) && (
                      <span className="gantt-conflict-icon" title="Deze persoon staat vandaag op meerdere projecten ingepland.">
                        <AlertTriangle size={12} />
                      </span>
                    )}
                  </div>
                  <div className="task-meta">
                    <span>
                      <Link href={`/projects/${r.projectId}/bouwplanning`} className="gantt-row-title-link">
                        {r.projectName}
                      </Link>
                    </span>
                    <span>{r.title}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {groupEntries.map(([assignee, items]) => (
        <div key={assignee} className="overview-group">
          <div className="overview-group-head">{assignee}</div>
          <div className="task-list">
            {items
              .sort((a, b) => a.start_date.localeCompare(b.start_date))
              .map((r) => (
                <div key={r.id} className="task-row">
                  <div className="task-body">
                    <div className="task-title">
                      <Link href={`/projects/${r.projectId}/bouwplanning`} className="gantt-row-title-link">
                        {r.projectName}
                      </Link>
                      {conflictIds.has(r.id) && (
                        <span className="gantt-conflict-icon" title="Overlapt met een andere planning van deze persoon.">
                          <AlertTriangle size={12} />
                        </span>
                      )}
                    </div>
                    <div className="task-meta">
                      <span className="mono">{fmtRange(r.start_date, r.end_date)}</span>
                      <span>{r.title}</span>
                    </div>
                  </div>
                </div>
              ))}
          </div>
        </div>
      ))}

      {groupEntries.length === 0 && active.length === 0 && (
        <div className="empty-hint">Nog geen bouwplanning met een toegewezen persoon gevonden.</div>
      )}
    </div>
  );
}
