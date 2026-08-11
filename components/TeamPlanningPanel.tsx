import Link from "next/link";
import { AlertTriangle } from "lucide-react";

const DAY_MS = 86400000;
const WEEKDAY_LETTERS = ["Zo", "Ma", "Di", "Wo", "Do", "Vr", "Za"];

export interface PlanningRow {
  id: string;
  title: string;
  projectId: string;
  projectName: string;
  start_date: string;
  end_date: string;
}

export interface PlanningGroup {
  assignee: string;
  rows: PlanningRow[];
}

function overlaps(aStart: string, aEnd: string, bStart: string, bEnd: string) {
  return aStart <= bEnd && bStart <= aEnd;
}

export function TeamPlanningPanel({ groups }: { groups: PlanningGroup[] }) {
  const todayMs = new Date(new Date().toISOString().slice(0, 10) + "T00:00:00Z").getTime();

  return (
    <div className="panel">
      <div className="hint-bar">
        Overzicht van de bouwplanning van al je projecten samen, gegroepeerd per persoon — zo zie je in één oogopslag wie waar en
        wanneer loopt, en of iemand op hetzelfde moment op twee projecten staat ingepland.
      </div>
      {groups.length === 0 && <div className="empty-hint">Nog geen bouwplanning met een toegewezen persoon gevonden.</div>}
      {groups.map((group) => {
        const conflictIds = new Set<string>();
        for (const a of group.rows) {
          for (const b of group.rows) {
            if (a.id !== b.id && overlaps(a.start_date, a.end_date, b.start_date, b.end_date)) {
              conflictIds.add(a.id);
            }
          }
        }

        const days: Date[] = [];
        const min = Math.min(...group.rows.map((r) => new Date(r.start_date).getTime()));
        const max = Math.max(...group.rows.map((r) => new Date(r.end_date).getTime()));
        for (let t = min; t <= max; t += DAY_MS) days.push(new Date(t));
        const todayIdx = days.findIndex((d) => d.getTime() === todayMs);

        return (
          <div key={group.assignee} className="planning-overzicht-group">
            <div className="planning-overzicht-name">
              {group.assignee}
              {conflictIds.size > 0 && (
                <span className="gantt-conflict-icon" title="Deze persoon staat op hetzelfde moment op meerdere projecten ingepland.">
                  <AlertTriangle size={12} />
                </span>
              )}
            </div>
            <div className="gantt-scroll">
              <div className="gantt-grid" style={{ gridTemplateColumns: `220px repeat(${days.length}, 30px)` }}>
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

                {group.rows.map((r) => {
                  const start = new Date(r.start_date).getTime();
                  const end = new Date(r.end_date).getTime();
                  const filledFlags = days.map((d) => {
                    const t = d.getTime();
                    const wd = d.getUTCDay();
                    return t >= start && t <= end && wd !== 0 && wd !== 6;
                  });
                  return (
                    <div key={r.id} style={{ display: "contents" }}>
                      <div className="gantt-cell gantt-row-label">
                        <div className="gantt-row-title">
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
                            title={filled ? `${r.projectName} — ${r.title}: ${r.start_date} – ${r.end_date}` : ""}
                          />
                        );
                      })}
                    </div>
                  );
                })}

                {todayIdx >= 0 && <div className="gantt-today-line" style={{ left: `${220 + todayIdx * 30 + 15}px` }} title="Vandaag" />}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
