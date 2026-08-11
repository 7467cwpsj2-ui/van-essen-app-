import Link from "next/link";
import { AlertTriangle } from "lucide-react";

const DAY_MS = 86400000;
const WEEKDAY_LETTERS = ["Zo", "Ma", "Di", "Wo", "Do", "Vr", "Za"];
const PROJECT_COLORS = ["#2f6fed", "#dd6b20", "#38a169", "#d53f8c", "#805ad5", "#319795", "#c05621", "#3182ce", "#b7791f", "#4c51bf"];

function colorForProject(projectId: string): string {
  let hash = 0;
  for (let i = 0; i < projectId.length; i++) hash = (hash * 31 + projectId.charCodeAt(i)) >>> 0;
  return PROJECT_COLORS[hash % PROJECT_COLORS.length];
}

export interface PlanningRow {
  id: string;
  title: string;
  projectId: string;
  projectName: string;
  assignee: string | null;
  start_date: string;
  end_date: string;
}

interface PlanningGroup {
  assignee: string;
  rows: PlanningRow[];
}

function overlaps(aStart: string, aEnd: string, bStart: string, bEnd: string) {
  return aStart <= bEnd && bStart <= aEnd;
}

export function TeamPlanningPanel({ rows }: { rows: PlanningRow[] }) {
  const groupMap = new Map<string, PlanningGroup>();
  for (const r of rows) {
    const key = r.assignee ? r.assignee.toLowerCase() : "￿";
    if (!groupMap.has(key)) groupMap.set(key, { assignee: r.assignee ?? "Nog niet toegewezen", rows: [] });
    groupMap.get(key)!.rows.push(r);
  }
  const groups = Array.from(groupMap.values()).sort((a, b) => {
    if (a.assignee === "Nog niet toegewezen") return 1;
    if (b.assignee === "Nog niet toegewezen") return -1;
    return a.assignee.localeCompare(b.assignee, "nl");
  });

  const todayMs = new Date(new Date().toISOString().slice(0, 10) + "T00:00:00Z").getTime();

  return (
    <div className="panel">
      <div className="hint-bar">
        Bouwplanning van al je projecten samen, gegroepeerd per persoon — zo zie je per teamlid of onderaannemer waar en wanneer hij
        loopt, en of hij op hetzelfde moment op twee projecten staat ingepland.
      </div>
      {groups.length === 0 && <div className="empty-hint">Nog geen bouwplanning met een toegewezen persoon gevonden.</div>}
      {groups.map((group) => {
        const conflictIds = new Set<string>();
        for (const a of group.rows) {
          for (const b of group.rows) {
            if (a.id !== b.id && overlaps(a.start_date, a.end_date, b.start_date, b.end_date)) conflictIds.add(a.id);
          }
        }

        const sortedRows = [...group.rows].sort((a, b) => a.start_date.localeCompare(b.start_date));
        const days: Date[] = [];
        const min = Math.min(...sortedRows.map((r) => new Date(r.start_date).getTime()));
        const max = Math.max(...sortedRows.map((r) => new Date(r.end_date).getTime()));
        for (let t = min; t <= max; t += DAY_MS) days.push(new Date(t));
        const todayIdx = days.findIndex((d) => d.getTime() === todayMs);

        return (
          <div key={group.assignee} className="planning-person-block">
            <div className="planning-person-name">
              {group.assignee}
              {conflictIds.size > 0 && (
                <span className="gantt-conflict-icon" title="Deze persoon staat op hetzelfde moment op meerdere projecten ingepland.">
                  <AlertTriangle size={12} />
                </span>
              )}
            </div>
            <div className="gantt-scroll">
              <div className="gantt-grid" style={{ gridTemplateColumns: `180px repeat(${days.length}, 30px)` }}>
                <div className="gantt-cell gantt-corner" />
                {days.map((d, idx) => {
                  const wd = d.getUTCDay();
                  return (
                    <div
                      key={idx}
                      className={"gantt-cell gantt-head" + (wd === 0 || wd === 6 ? " weekend" : "") + (idx === todayIdx ? " today" : "")}
                      title={d.toISOString().slice(0, 10)}
                    >
                      <span className="gantt-head-day">{d.getUTCDate()}</span>
                      <span className="gantt-head-wd">{WEEKDAY_LETTERS[wd]}</span>
                    </div>
                  );
                })}

                {sortedRows.map((r) => {
                  const start = new Date(r.start_date).getTime();
                  const end = new Date(r.end_date).getTime();
                  const filledFlags = days.map((d) => {
                    const t = d.getTime();
                    const wd = d.getUTCDay();
                    return t >= start && t <= end && wd !== 0 && wd !== 6;
                  });
                  const color = colorForProject(r.projectId);
                  return (
                    <div key={r.id} style={{ display: "contents" }}>
                      <div className="gantt-cell gantt-row-label">
                        <div className="gantt-row-title">
                          <span className="planning-dot" style={{ background: color }} />
                          <Link href={`/projects/${r.projectId}/bouwplanning`} className="gantt-row-title-link">
                            {r.projectName}
                          </Link>
                          {conflictIds.has(r.id) && (
                            <span className="gantt-conflict-icon" title="Overlapt met een andere planning van deze persoon.">
                              <AlertTriangle size={12} />
                            </span>
                          )}
                        </div>
                        <div className="gantt-row-sub">
                          <span>{r.title}</span>
                        </div>
                      </div>
                      {days.map((d, idx) => {
                        const wd = d.getUTCDay();
                        const filled = filledFlags[idx];
                        const isFirst = filled && !filledFlags[idx - 1];
                        const isLast = filled && !filledFlags[idx + 1];
                        return (
                          <div
                            key={idx}
                            className={
                              "gantt-cell gantt-daycell" +
                              (filled ? " filled" : "") +
                              (isFirst ? " first" : "") +
                              (isLast ? " last" : "") +
                              (wd === 0 || wd === 6 ? " weekend" : "")
                            }
                            style={filled ? { background: color } : undefined}
                            title={filled ? `${r.projectName} — ${r.title}: ${r.start_date} – ${r.end_date}` : ""}
                          />
                        );
                      })}
                    </div>
                  );
                })}

                {todayIdx >= 0 && <div className="gantt-today-line" style={{ left: `${180 + todayIdx * 30 + 15}px` }} title="Vandaag" />}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
